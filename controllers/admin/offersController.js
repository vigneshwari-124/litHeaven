const Categories = require('../../models/Categories')
const Offers=require('../../models/Offers')
const Product = require('../../models/Product');
const mongoose = require('mongoose');

const categroyOff=(req,res)=>{
    res.render('admin/categoryOff')
}

const getCategoryOff= async(req,res)=>{
    try{
        let {page=1, limit=5, search='', status='all'}=req.query

        page=parseInt(page)
        limit=parseInt(limit)

        const query={type:"category"}

    if (search) {
          const categories = await Categories.find({
            name: { $regex: search, $options: "i" }
        });

        const categoryIds = categories.map(c => c._id);

      query.$or = [
        { offerName: { $regex: search, $options: "i" } },
        { category: { $in: categoryIds } }
      ];
    }

        let offers=await Offers.find(query)
        .populate("category","name")
        .sort({createdAt:-1})

        

      const today = new Date();
      today.setHours(0,0,0,0);

    offers = offers.filter(o => {
      const start = new Date(o.startDate);
      
      const end = new Date(o.endDate);

      if (today < start) return status === 'upcoming' || status === 'all';
      if (today > end) return status === 'expired' || status === 'all';
      return status === 'active' || status === 'all';
    });

    const total = offers.length;
    const paginated = offers.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paginated,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

    }catch(err){
        console.log(err)
        res.status(500).json({message:"something went wrong"})

    }
}

const postOffer = async (req, res) => {
  try {
    const { category, offerName, discount, startDate, endDate } = req.body;

    if (!category || !offerName || !discount || !startDate || !endDate) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.json({
        success: false,
        message: "Start date must be before end date"
      });
    }

   
    const existingOffer = await Offers.findOne({
      category,
      offerName: offerName.toLowerCase(),
      type: "category"
    });

    if (existingOffer) {
      return res.json({
        success: false,
        message: "Offer name already exists for this category"
      });
    }


    const today = new Date();
today.setHours(0,0,0,0);

const start = new Date(startDate);
const end = new Date(endDate);

if(start < today){
  return res.json({
    success:false,
    message:"Start date cannot be in the past"
  });
}

if(end < today){
  return res.json({
    success:false,
    message:"End date cannot be in the past"
  });
}

if(start.getTime() === end.getTime()){
  return res.json({
    success:false,
    message:"End date must be greater than start date"
  });
}

if(end < start){
  return res.json({
    success:false,
    message:"End date must be after start date"
  });
}

    const newOffer = new Offers({
      category,
      offerName: offerName.toLowerCase(),
      discount,
      startDate,
      endDate,
      type: "category",
      isListed: true
    });

    await newOffer.save();

    res.json({
      success: true,
      message: "Category offer added successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offers.findById(id);

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found"
      });
    }

    
    offer.isListed = !offer.isListed;

    await offer.save();

    res.json({
      success: true,
      message: "Status updated",
      isListed: offer.isListed
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, offerName, discount, startDate, endDate } = req.body;

    const offer = await Offers.findById(id);

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found"
      });
    }

    offer.category = category;
    offer.offerName = offerName.toLowerCase();
    offer.discount = discount;
    offer.startDate = startDate;
    offer.endDate = endDate;

    await offer.save();

    res.json({
      success: true,
      message: "Offer updated successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offers.findById(id);

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found"
      });
    }

    await Offers.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Offer deleted successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const subCategoryOff=(req,res)=>{
  res.render('admin/subCategoryOff')
}

const getSubOff = async (req, res) => {
  try {
    let { page = 1, limit = 5, search = '', status = "all" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    search = search.trim();

    let offers = await Offers.find({ type: "subcategory" })
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .sort({ createdAt: -1 });;
      

    if (search) {
      const regex = new RegExp(search, "i");

      offers = offers.filter(o =>
        regex.test(o.offerName || "") ||
        regex.test(o.category?.name || "") ||
        regex.test(o.subCategory?.name || "")
      );
    }

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    offers = offers.filter(e => {
      let start = new Date(e.startDate);
      let end = new Date(e.endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (status === "all") return true;

      if (status === "unlisted") return !e.isListed;

      if (status === "upcoming") return e.isListed && today < start;

      if (status === "active") return e.isListed && today >= start && today <= end;

      if (status === "expired") return e.isListed && today > end;

      return true;
    });

    const total = offers.length;
    const paginated = offers.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paginated,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};


const postSubCategoryOffer = async (req, res) => {
  try {
    let { category, subCategory, offerName, discount, startDate, endDate } = req.body;

    if (!category || !subCategory || !offerName || !discount || !startDate || !endDate) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    let today = new Date();
    today.setHours(0,0,0,0);

    let start = new Date(startDate);
    let end = new Date(endDate);

    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    if(start < today){
      return res.json({
        success: false,
        message: "Start date cannot be in the past"
      });
    }

    if(end < start){
      return res.json({
        success: false,
        message: "End date must be after start date"
      });
    }

    const existingOffer = await Offers.findOne({
      subCategory,
      type: "subcategory",
      isListed: true,
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    });

    if (existingOffer) {
      return res.json({
        success: false,
        message: "Another active offer already exists for this subcategory in this date range"
      });
    }

    const newOffer = new Offers({
      category,
      subCategory,
      offerName: offerName.toLowerCase().trim(),
      discount,
      startDate: start,
      endDate: end,
      type: "subcategory",
      isListed: true
    });

    await newOffer.save();

    res.json({
      success: true,
      message: "SubCategory offer added successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const getSingleSubOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offers.findById(id)
      .populate('category', 'name')
      .populate('subCategory', 'name');

    if (!offer) {
      return res.json({ success: false, message: "Offer not found" });
    }

    res.json({ success: true, offer });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

const updateSubCategory=async(req,res)=>{
  try{
    const {id}=req.params
    const {category,subCategory,discount,offerName,startDate,endDate}=req.body

     const offer = await Offers.findById(id);

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found"
      });
    }

    offer.category = category;
    offer.subCategory=subCategory;
    offer.offerName = offerName.toLowerCase();
    offer.discount = discount;
    offer.startDate = startDate;
    offer.endDate = endDate;

    await offer.save();

    res.json({
      success: true,
      message: "Offer updated successfully"
    });



  }catch(err){
    console.log(err)
    res.status(500).json({message:"something went wrong"})
  }
}


const deleteSubCategoryOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offers.findById(id);

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found"
      });
    }

    await Offers.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Offer deleted successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};



const productOffer=(req,res)=>{
  res.render('admin/productOff')
}


const getProductOff = async (req, res) => {
  try {
    let { page = 1, limit = 5, search = '', status = "all" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    search = search.trim();

    let offers = await Offers.find({ type: "product" })
    .sort({createdAt:-1})
      .populate({
       path: 'product',
       select: 'title variants',
       populate: {
          path: 'variants.language',
          select: 'languageName'
       }
      })

    if (search) {
      const regex = new RegExp(search, "i");

      offers = offers.filter(o =>
        regex.test(o.offerName || "") ||
        regex.test(o.product?.title || "")
      );
    }

  
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    
    offers = offers.filter(e => {
      let start = new Date(e.startDate);
      let end = new Date(e.endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (status === "all") return true;
      if (status === "unlisted") return !e.isListed;
      if (status === "upcoming") return e.isListed && today < start;
      if (status === "active") return e.isListed && today >= start && today <= end;
      if (status === "expired") return e.isListed && today > end;

      return true;
    });

    
 offers = offers.map(o => {

  let matchedVariant = null;

  o.product?.variants?.forEach(v => {

    const vLang = String(
      v.language?.languageName || v.language || ""
    ).toLowerCase().trim();

    const oLang = String(o.language || "").toLowerCase().trim();

    if (vLang === oLang) {

      v.formats?.forEach(f => {

        if (
          Array.isArray(o.format)
            ? o.format.includes(f.format)
            : f.format === o.format
        ) {
          matchedVariant = f;
        }

      });

    }

  });

  let originalPrice = matchedVariant ? Number(matchedVariant.price) : 0;

  let offerPrice = originalPrice
    ? originalPrice - (originalPrice * o.discount / 100)
    : 0;

  return {
    ...o._doc,
    originalPrice,
    offerPrice: Math.round(offerPrice)
  };
});
    const total = offers.length;
    const paginated = offers.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paginated,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

const postProductOffer = async (req, res) => {
  try {
    let { product, language, format, offerName, discount, startDate, endDate } = req.body;

    if (!product || !language || !format || !offerName || !discount || !startDate || !endDate) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    let today = new Date();
    today.setHours(0,0,0,0);

    let start = new Date(startDate);
    let end = new Date(endDate);

    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    if(start < today){
      return res.json({
        success: false,
        message: "Start date cannot be in the past"
      });
    }

    if(end < start){
      return res.json({
        success: false,
        message: "End date must be after start date"
      });
    }

   for (let f of format) {

  const existingOffer = await Offers.findOne({
    product,
    language,
    format: f,
    type: "product",
    isListed: true,
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start }
      }
    ]
  });

    if (existingOffer) {
      return res.json({
        success: false,
        message:  `Offer already exists for ${f}`
      });
    }

   
    const newOffer = new Offers({
      product: new mongoose.Types.ObjectId(product),
      language,
      format:f,
      offerName: offerName.toLowerCase().trim(),
      discount,
      startDate: start,
      endDate: end,
      type: "product",
      isListed: true
    });

    await newOffer.save();
  }

    res.json({
      success: true,
      message: "Product offer added successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};



const getProductsForOffer = async (req, res) => {
  try {

    const products = await Product.find({ isDeleted: false }) 
      .populate("variants.language", "languageName") 
      .select("title variants"); 

    res.json({
      success: true,
      products
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products"
    });
  }
};


const getSingleProductOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offers.findById(id).populate({
      path: 'product',
      select: 'title variants',
      populate: {
        path: 'variants.language',
        select: 'languageName'
      }
    });

    if (!offer) {
      return res.json({ success: false, message: "Offer not found" });
    }

    res.json({
      success: true,
      offer
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

const updateProductOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, language, format, offerName, discount, startDate, endDate } = req.body;

    const offer = await Offers.findById(id);

    if (!offer) {
      return res.json({ success: false, message: "Offer not found" });
    }

    offer.product = product;
    offer.language = language;

   
    offer.format = Array.isArray(format) ? format[0] : format;

    offer.offerName = offerName.toLowerCase().trim();
    offer.discount = discount;
    offer.startDate = new Date(startDate);
    offer.endDate = new Date(endDate);

    await offer.save();

    res.json({
      success: true,
      message: "Offer updated successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

const deleteProductOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offers.findByIdAndDelete(id);

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found"
      });
    }

    res.json({
      success: true,
      message: "Offer deleted successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

module.exports={
    categroyOff,
    getCategoryOff,
    postOffer,
    toggleOfferStatus,
    updateOffer,
    deleteOffer,
    subCategoryOff,
    getSubOff,
    postSubCategoryOffer,
    updateSubCategory,
    getSingleSubOffer,
    deleteSubCategoryOffer,
    productOffer,
    getProductOff ,
    postProductOffer,
    getProductsForOffer,
    getSingleProductOffer,
    updateProductOffer,
    deleteProductOffer 
}