const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/admin/adminAuthController')
const categoryController=require('../../controllers/admin/categoryController')
const languageController=require('../../controllers/admin/languageController')
const authorController = require('../../controllers/admin/authorController')
const productController=require('../../controllers/admin/productController')
const orderManageController=require('../../controllers/admin/orderAuthController')
const couponController=require('../../controllers/admin/couponController')
const offersController=require('../../controllers/admin/offersController')
const salesReportController=require('../../controllers/admin/salesReportController')
const adminAuth = require('../../middlewares/adminAuth')
const noCache=require('../../middlewares/noCache')
const upload = require('../../middlewares/upload');


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


router.get('/login', noCache, adminController.getLogin)
router.post('/login', adminController.postAdminLogin)
router.post('/logout', adminAuth, adminController.logout)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/dashboard', noCache, adminAuth, adminController.adminDashboard)
router.get('/dashboard/chart-data',adminAuth,adminController.getChartData)
router.get('/dashboard/stats',adminAuth,adminController.getDashboardStats)
router.get('/dashboard/top-data',adminAuth,adminController.getTopProducts)
router.get('/dashboard/card-data',adminAuth, adminController.getDashboardCards)
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// =
router.get('/customer', noCache, adminAuth, adminController.getCustomer)
router.get('/customers/:id', noCache, adminAuth, adminController.getCustomerById)
router.patch('/users/:id/block',adminAuth, adminController.toggleBlockUser)
router.get('/customer/search', noCache, adminAuth, adminController.searchCustomers)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/category', noCache, adminAuth, categoryController.categoryPage)
router.get('/category/search', noCache, adminAuth, categoryController.searchCategories)
router.post("/category", adminAuth,categoryController.addCategory)
router.put("/category/:id",adminAuth, categoryController.updateCategory)
router.patch('/category/toggle-delete/:id',adminAuth,categoryController.toggleCategoryDelete)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/sub-category', noCache, adminAuth, categoryController.subCategoryPage)
router.get('/sub-category/data', adminAuth, categoryController.getSubCategories)
router.post('/sub-category', adminAuth, upload.single('image'), categoryController.addSubCategory)
router.get('/parent-categories', adminAuth, categoryController.getParentCategories)
router.put('/sub-category/:id', adminAuth, upload.single('image'), categoryController.updateSubCategory)
router.put('/sub-category/featured/:id',adminAuth, categoryController.toggleFeatured)
router.get('/subcategories/:categoryId', adminAuth,categoryController.getSubCategoriesForProduct);
router.patch('/sub-category/delete/:id', adminAuth,categoryController.toggleSubCategoryDelete);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/language', adminAuth, languageController.languagePage)
router.get('/languages', adminAuth, languageController.getLanguages)
router.post('/languages', adminAuth, languageController.addLanguage)
router.put('/languages/:id', adminAuth, languageController.updateLanguage)
router.delete('/languages/:id', adminAuth, languageController.deleteLanguage)
router.get('/languages/active',adminAuth, languageController.getActiveLanguages);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/author', noCache, adminAuth, authorController.authorPage)
router.get('/author/search', noCache, adminAuth, authorController.searchAuthors)
router.post('/author', adminAuth, authorController.createAuthor)
router.put('/author/:id', adminAuth, authorController.updateAuthor)
router.get('/authors/active',noCache, adminAuth, authorController.getAllAuthors)
router.patch('/author/toggle-delete/:id', adminAuth, authorController.toggleAuthorDelete)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
router.get('/product',noCache,adminAuth,productController.productPage)
router.get('/products',adminAuth,productController.getProduct)
// router.post('/products',adminAuth,upload.fields([{ name: 'thumbnails', maxCount: 20 },{ name: 'subImages', maxCount: 60 }]), productController.addProduct)
router.post('/products', adminAuth, upload.fields([{ name: 'images', maxCount: 30 }]), productController.addProduct)
router.get('/products/:id', adminAuth, productController.getProductById);
// router.put('/products/:id', adminAuth, upload.fields([{ name: 'thumbnails', maxCount: 20 }, { name: 'subImages', maxCount: 60 }]),productController.updateProduct);
router.put('/products/:id', adminAuth, upload.fields([{ name: 'images', maxCount: 30 }]), productController.updateProduct);
router.patch('/products/:id/toggle-list', adminAuth, productController.toggleProductList);

//========================================================================================================================//

router.get('/order',adminAuth,orderManageController.orderPage)
router.get('/orders',adminAuth, adminAuth, orderManageController.getOrders)
router.patch('/orders/:id/status', adminAuth, orderManageController.updateOrderStatus)
router.get( '/orders/:id',adminAuth,orderManageController.getOrderById);
router.patch('/orders/:id/item-status',adminAuth,orderManageController.updateItemStatus)
router.patch('/orders/:orderId/items/:itemId/cancel',adminAuth,orderManageController.cancelSingleItem)
router.patch('/orders/:orderId/cancel',adminAuth,orderManageController.cancelFullOrder)
//=========================================================================================================================//

router.get('/coupon',adminAuth,couponController.couponPage)
router.get('/coupon-data', adminAuth, couponController.getCoupons)
router.post('/coupon',adminAuth,couponController.postCoupon)
router.get('/coupon/:id',adminAuth, couponController.getSingleCoupon)
router.put('/coupon/:id',adminAuth, couponController.updateCoupon)
router.delete('/coupon/:id',adminAuth, couponController.deleteCoupon)

//============================================================================================================================//

router.get('/categoryOff',adminAuth,offersController.categroyOff)
router.get('/category-off',adminAuth,offersController.getCategoryOff)
router.post('/categoryOff',adminAuth,offersController.postOffer)
router.patch('/offer-toggle/:id', adminAuth, offersController.toggleOfferStatus);
router.put('/categoryOff/:id', adminAuth, offersController.updateOffer);
router.delete('/categoryOff/:id', adminAuth, offersController.deleteOffer);

//============================================================================================================================//

router.get('/subCategoryOff',adminAuth,offersController.subCategoryOff)
router.get('/subOffer',adminAuth,offersController.getSubOff)
router.post('/subCategoryOff', adminAuth, offersController.postSubCategoryOffer);
router.put('/subCategoryOff/:id',adminAuth,offersController.updateSubCategory)
router.get('/subOffer/:id', adminAuth, offersController.getSingleSubOffer);
router.delete('/subCategoryOff/:id', adminAuth, offersController.deleteSubCategoryOffer);


//=================================================================================================================================================

router.get('/productOff',adminAuth,offersController.productOffer)
router.get('/product-off', adminAuth, offersController.getProductOff);
router.post('/productOff', adminAuth, offersController.postProductOffer);
router.get('/products-for-offer', adminAuth, offersController.getProductsForOffer);
router.get('/productOffer/:id', adminAuth,offersController.getSingleProductOffer);
router.put('/productOffer/:id', adminAuth,offersController.updateProductOffer )
router.delete('/productOffer/:id', adminAuth,offersController.deleteProductOffer);


//===========================================================================================================

router.get('/salesReport',adminAuth,salesReportController.salesReport)
router.get('/salesReport-data',adminAuth,salesReportController.getSalesReport)

module.exports = router
