const Product=require('../../models/Product')
const cloudinary = require('../../config/cloudinary');
const Category = require('../../models/Categories');
const Author   = require('../../models/Author');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const productPage=(req,res)=>{
    res.render('admin/product')
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getProduct = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 7;
    const skip   = (page - 1) * limit;
    const search = req.query.search || "";

    let filter = {isDeleted: false};

    if (search) {
      
      const matchingCategories = await Category.find({
          name: { $regex: `\\b${search}\\b`, $options: "i" }
      }).select("_id");

     const matchingAuthors = await Author.find({
         name: { $regex: `\\b${search}\\b`, $options: "i" }
     }).select("_id");

      const catIds    = matchingCategories.map(c => c._id);
      const authorIds = matchingAuthors.map(a => a._id);

      filter.$or = [
        { title:       { $regex: `\\b${search}\\b`, $options: "i" } },
        { category:    { $in: catIds } },
        { subCategory: { $in: catIds } },
        { author:      { $in: authorIds } }
      ];
    }

    const totalProducts = await Product.countDocuments(filter);

    

    const products = await Product.find(filter)
      .populate("category")
      .populate("subCategory")
      .populate("author")
      .populate("variants.language")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });


    res.json({
      success: true,
      products,
      currentPage:  page,
      totalPages:   Math.ceil(totalProducts / limit),
      totalProducts
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("subCategory")
      .populate("author")
      .populate("variants.language");



    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addProduct = async (req, res) => {
  try {

  const { title,shortDescription, description, category, subCategory, author } = req.body;


    const variants = JSON.parse(req.body.variants);

    const thumbnailFiles = req.files['thumbnails'] || [];
    const subImageFiles = req.files['subImages'] || [];

console.log("Variants:", variants);
console.log("Thumbnail files:", thumbnailFiles.length);
console.log("Sub files:", subImageFiles.length);

    if (!title ||!shortDescription || !description || !category || !subCategory || !author || !variants.length) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

  const existing = await Product.findOne({
  title: title.trim().toLowerCase()
  });

  if (existing) {
  return res.status(400).json({
    success: false,
    message: "Product already exists"
  });
}
     
    let thumbIndex = 0;
    let subIndex = 0;

    const processedVariants = [];

    for (const variant of variants) {

      const thumbFile = thumbnailFiles[thumbIndex++];

      const thumbUpload = await cloudinary.uploader.upload(
        thumbFile.path,
        { folder: "products/thumbnails" }
      );

      const subImages = [];

      for (let i = 0; i < variant.subImageFiles.length; i++) {

        const file = subImageFiles[subIndex++];

        const uploadResult = await cloudinary.uploader.upload(
          file.path,
          { folder: "products/sub_images" }
        );

        subImages.push({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        });
      }

      processedVariants.push({
        language: variant.language,
        thumbnail: {
          url: thumbUpload.secure_url,
          publicId: thumbUpload.public_id
        },
        subImages,
        formats: variant.formats.map(f => ({
          format: f.format,
          price: Number(f.price),
          stock: Number(f.stock),
          sold: 0
        }))
      });

    }
        
    const newProduct = new Product({
      title,
      shortDescription,
      description,
      category,
      subCategory,
      author,
      variants: processedVariants
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateProduct = async (req, res) => {
  try {
    const { title,shortDescription, description, category, subCategory, author } = req.body;

    if (!title || !shortDescription || !description || !category || !subCategory || !author) {
        return res.status(400).json({
          success: false,
          message: "All fields are required"
        });
    }
    const variants = JSON.parse(req.body.variants);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const thumbnailFiles = req.files['thumbnails'] || [];
    const subImageFiles = req.files['subImages'] || [];

    let thumbIdx = 0;
    let subIdx = 0;

    const processedVariants = [];

    for (const variant of variants) {
      let thumbnail;

      if (variant.newThumbIndex && thumbnailFiles[thumbIdx]) {
    
        if (variant.existingThumbnail?.publicId) {
          await cloudinary.uploader.destroy(variant.existingThumbnail.publicId);
        }
        const upload = await cloudinary.uploader.upload(
          thumbnailFiles[thumbIdx++].path,
          { folder: "products/thumbnails" }
        );
        thumbnail = { url: upload.secure_url, publicId: upload.public_id };
      } else {
      
        thumbnail = variant.existingThumbnail;
      }

      const subImages = [];

      const existingSubs = variant.existingSubImages || [];

      for (let i = 0; i < 3; i++) {
        if (i < existingSubs.length && existingSubs[i]?.url) {
          subImages.push(existingSubs[i]);
        } else if (subImageFiles[subIdx]) {
          const upload = await cloudinary.uploader.upload(
            subImageFiles[subIdx++].path,
            { folder: "products/sub_images" }
          );
          subImages.push({ url: upload.secure_url, publicId: upload.public_id });
        }
      }

      processedVariants.push({
        language: variant.language,
        thumbnail,
        subImages,
        formats: variant.formats.map(f => ({
          format: f.format,
          price: Number(f.price),
          stock: Number(f.stock),
          sold: f.sold || 0
        }))
      });
    }

    product.title = title;
    product.shortDescription = shortDescription;
    product.description = description;
    product.category = category;
    product.subCategory = subCategory;
    product.author = author;
  
const removedVariants = product.variants.filter(oldVariant =>
  !variants.some(v => v.language.toString() === oldVariant.language.toString())
);

for (const rv of removedVariants) {

  if (rv.thumbnail?.publicId) {
    await cloudinary.uploader.destroy(rv.thumbnail.publicId);
  }

  if (rv.subImages && rv.subImages.length) {
    for (const img of rv.subImages) {
      if (img.publicId) {
        await cloudinary.uploader.destroy(img.publicId);
      }
    }
  }

}

product.variants = processedVariants;

    await product.save();


    res.json({ success: true, message: "Product updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleProductList = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("subCategory")
      .populate("author")

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.isDeleted === true) {

      if (product.category?.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Cannot list product. Category is unlisted."
        });
      }

      if (product.subCategory?.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Cannot list product. Sub-category is unlisted."
        });
      }

       if (product.author?.isDeleted) {
        return res.status(400).json({
          success:false,
          message:"Cannot list product. Author is unlisted."
        })
      }

    }

    product.isDeleted = !product.isDeleted;
    await product.save();

    res.json({
      success: true,
      message: product.isDeleted
        ? "Product unlisted"
        : "Product listed"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getProductsForOffer = async (req, res) => {
  const products = await Product.find({ isDeleted: false })
    .populate("variants.language", "languageName")
    .select("title variants");

  res.json({ success: true, products });
};

module.exports={
    productPage,
    getProduct,
    getProductById,
    addProduct,
    updateProduct,
    toggleProductList,
     
}