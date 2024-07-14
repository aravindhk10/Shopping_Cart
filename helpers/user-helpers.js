var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { use } = require('../routes/user');
const { response } = require('express');
const ObjectId = require('mongodb').ObjectId;
const Razorpay = require('razorpay');
const { promises } = require('fs');

var instance = new Razorpay({
    key_id: 'rzp_test_IvGWMBpENteAE2',
    key_secret: 'tH4vJwFji3WLnDms9bT9sPyL',
});
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })

    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("login success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log("login failed")
                        resolve({ status: false })
                    }
                })
            }
            else {
                console.log("login failed")
                resolve({ status: false })
            }
        })
    },
    addTOCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) }, {
                        $inc: { 'products.$.quantity': 1 }
                    }).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) }, {
                        $push: { products: proObj }
                    }).then((response) => {
                        resolve()
                    })
                }
            }
            else {
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                { $match: { user: new ObjectId(userId) } },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            if (cartItems[0]) {
                console.log(cartItems[0].products);
            } else {
                console.log('Cart is empty');
            }
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            let count = 0
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(details.cart) }, {
                    $pull: { products: { item: new ObjectId(details.product) } }
                }).then((response) => {
                    resolve({ removeProduct: true })
                })
            }
            else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) }, {
                    $inc: { 'products.$.quantity': details.count }
                }).then((response) => {
                    resolve({ status: true })
                })
            }
        })

    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                { $match: { user: new ObjectId(userId) } },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $addFields: {
                        "product.Price": {
                            $toInt: "$product.Price"
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.Price'] } }
                    }
                }
            ]).toArray()
            if (total[0]) {
                console.log(total[0].total)
                resolve(total[0].total)
            } else {
                console.log(0)
                resolve(0)
            }
        })
    },
    placeorder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order['paymentmethod'] === 'COD' ? 'placed' : 'pending'
            let orderobj = {
                deliverydetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: new ObjectId(order.userId),
                paymentmethod: order['paymentmethod'],
                products: products,
                status: status,
                total: total,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderobj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) })
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cart.products) {
                resolve(cart.products)
            } else {
                reject('No cart found for this user')
            }
        })
    },
    getuserorders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                { $match: { _id: new ObjectId(orderId) } },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log("New order", order);
                resolve(order)
            });
        })
    },
    verifypayment: (details) => {
        return new Promise((resolve, reject) => {
            var crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'tH4vJwFji3WLnDms9bT9sPyL');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex');
            if(hmac === details['payment[razorpay_signature]']){
                resolve()
            }
            else{
                reject()
            }
        })
    },
        changePaymentStatus:(orderId)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new ObjectId(orderId)},
            
                {
                    $set:{
                        status:'placed'
                    }
                }).then(()=>{
                    resolve();
                })
            })
        },
    }

