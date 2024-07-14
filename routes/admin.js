var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const { route } = require('./user');
/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
    res.render('admin/view-products',{admin : true, products})
  })
  
});

router.get('/add-product', function(req, res) {
  res.render('admin/add-product',{admin : true,})
})

router.post("/add-product", (req, res) => {
  console.log(req.body);
  console.log(req.files.Image);
  productHelpers.addProduct(req.body, (insertedId) => {
    let image = req.files.Image;
    image.mv("./public/product-images/" + insertedId + ".jpg", (err) => {
      if (!err) {
        res.render("admin/add-product",{admin : true,});
      } else {
        // Handle the error here if needed
        console.error("Error moving image:", err);
        res.status(500).send("Error moving image");
      }
    });
  });
});

router.get('/delete-product/:id', (req, res)=>{
  let proId = req.params.id
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })
})

router.get("/edit-product/:id", async (req, res)=>{
  let product = await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product})
})

router.post("/edit-product/:id", (req, res) => {
  let insertedId = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin");
    if (req.files.Image) {
      let image = req.files.Image;
      image = req.files.Image;
      image.mv("./public/product-images/" + insertedId + ".jpg");
    }
  });
});

module.exports = router;
