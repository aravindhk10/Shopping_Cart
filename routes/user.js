var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var userHelpers = require('../helpers/user-helpers');
const { json } = require('body-parser');

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next()
  }
  else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  console.log(user)
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { admin: false, products, user, cartCount })
  })
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  }
  else {
    res.render('user/login', { "loginErr": req.session.userLoginErr })
    req.session.userLoginErr = false
  }
})

router.get("/signup", (req, res) => {
  res.render("user/signup")
})

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response)
    req.session.user = response
    req.session.loggedIn = true
    res.redirect('/')

  })
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    }
    else {
      req.session.userLoginErr = "Invalid Username or Password"
      res.redirect('/login')
    }
  });
});


router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.userLoggedIn = false
  res.redirect('/login')
})


router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let total = 0
  if(products.length>0){
    total = await userHelpers.getTotalAmount(req.session.user._id)
  }
  console.log(products)
  res.render('user/cart', { products, user: req.session.user, total })
})

router.get('/add-to-cart/:id', (req, res) => {
  console.log("api call")
  userHelpers.addTOCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { total, user: req.session.user })
})

router.post('/place-order', async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId)
  let total = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeorder(req.body, products, total).then((orderId) => {
    if (req.body['paymentmethod'] === 'COD') {
      res.json({cod_Success: true })
    }
    else {
      userHelpers.generateRazorpay(orderId, total).then((response) => {
        res.json(response)
      })
    }
  })
})

router.get('/ordersuccess', verifyLogin, async (req, res) => {
  res.render('user/ordersuccess', { user: req.session.user })
})

router.get('/vieworder', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getuserorders(req.session.user._id)
  res.render('user/vieworder', { user: req.session.user, orders })
})

router.get('/vieworderproducts/:id', verifyLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/vieworderproducts', { user: req.session.user, products })
})
router.get('/cancelorder/:id', verifyLogin, async (req, res) => {
  console.log(req.body)
})

router.post('/verify-payment',(req, res)=>{
  userHelpers.verifypayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("payment success")
      res.json({success:true})
    })
  }).catch((err)=>{
    res.json({success:false,errMsg:''})
  })
})

module.exports = router;
