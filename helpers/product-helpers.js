var db = require('../config/connection')
var collection = require('../config/collections');
const ObjectId = require('mongodb').ObjectId;
const { response } = require('express');
module.exports = {
    addProduct: (product, callback) => {
        db.get()
            .collection("product")
            .insertOne(product)
            .then((data) => {
                console.log(data);
                callback(data.insertedId);
            });
    },
    getAllProducts:()=>{
        return new Promise(async(resolve, reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProduct:(proId)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:ObjectId.createFromHexString(proId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id: ObjectId.createFromHexString(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(proId, proDetails)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId.createFromHexString(proId)},{
                $set:{
                    Name:proDetails.Name,
                    Description:proDetails.Description,
                    Price:proDetails.Price,
                    Category:proDetails.Category
                }
            }).then(response=>{
                resolve()
            })
        })
    }
}