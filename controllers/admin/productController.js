const Product = require('../../models/Product')
const Category = require('../../models/Categories');
const Author = require('../../models/Author');
const Language = require('../../models/Language');


const productPage = (req, res) => {
  res.render('admin/product')
}

const getProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    let filter = {};

    if (search) {
      const matchingCategories = await Category.find({
        name: { $regex: `\\b${search}\\b`, $options: "i" }
      }).select("_id");

      const matchingAuthors = await Author.find({
        name: { $regex: `\\b${search}\\b`, $options: "i" }
      }).select("_id");

      const catIds = matchingCategories.map(c => c._id);
      const authorIds = matchingAuthors.map(a => a._id);

      filter.$or = [
        { title: { $regex: `\\b${search}\\b`, $options: "i" } },
        { category: { $in: catIds } },
        { subCategory: { $in: catIds } },
        { author: { $in: authorIds } }
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
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

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


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addProduct = async (req, res) => {
  try {
    const { title, shortDescription, description, category, subCategory, author } = req.body;

    const letterRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    const titleTrimmed = title?.trim();
    const shortDescTrimmed = shortDescription?.trim();
    const descriptionTrimmed = description?.trim();

    const variants = JSON.parse(req.body.variants);
    const allImageFiles = req.files['images'] || [];

if (
  !titleTrimmed ||
  !shortDescTrimmed ||
  !descriptionTrimmed ||
  !category ||
  !subCategory ||
  !author 
) {
  return res.status(400).json({
    success: false,
    message: "All required fields must be filled"
  });
}

if (!Array.isArray(variants) || variants.length === 0) {
  return res.status(400).json({
    success: false,
    message: "At least one variant is required"
  });
}

if (!letterRegex.test(titleTrimmed)) {
  return res.status(400).json({
    success: false,
    message: "Product name should contain only letters with a single space between words."
  });
}

if (!letterRegex.test(shortDescTrimmed)) {
  return res.status(400).json({
    success: false,
    message: "Short description should contain only letters with a single space between words."
  });
}

if (!letterRegex.test(descriptionTrimmed)) {
  return res.status(400).json({
    success: false,
    message: "Description should contain only letters with a single space between words."
  });
}

    const existing = await Product.findOne({
  title: titleTrimmed.toLowerCase()
});

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Product already exists"
       });
    }


const categoryExists = await Category.findById(category);

if (!categoryExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid category"
  });
}

const subCategoryExists = await Category.findById(subCategory);

if (!subCategoryExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid sub-category"
  });
}

const authorExists = await Author.findById(author);

if (!authorExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid author"
  });
}


    let fileIdx = 0;


    const numberRegex = /^[0-9]+$/;

const languageSet = new Set();
for (const variant of variants) {


  if (!variant.language) {
    return res.status(400).json({
      success: false,
      message: "Language is required"
    });
  }

  if (languageSet.has(String(variant.language))) {
  return res.status(400).json({
    success: false,
    message: "Duplicate language is not allowed"
  });
}

languageSet.add(String(variant.language));

const languageExists = await Language.findById(variant.language);

if (!languageExists) {
  return res.status(400).json({
    success:false,
    message:"Invalid language"
  });
}

  if (!variant.formats || variant.formats.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Select at least one format"
    });
  }

  for (const format of variant.formats) {

    const allowedFormats = ["paperback","hardcover"];

if (!allowedFormats.includes(format.format)) {
  return res.status(400).json({
    success:false,
    message:"Invalid format"
  });
}

    if (
      format.price === undefined ||
      format.price === "" ||
      !numberRegex.test(String(format.price)) ||
      Number(format.price) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must contain whole numbers only"
      });
    }

    if (
      format.stock === undefined ||
      format.stock === "" ||
      !numberRegex.test(String(format.stock)) ||
      Number(format.stock) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must contain whole numbers only"
      });
    }

  }
}

    const toUrl = (file) => file ? `/uploads/${file.filename}` : null;


    
 const processedVariants = [];

for (const variant of variants) {

  const thumbFile = allImageFiles[fileIdx++];
  const sub1 = allImageFiles[fileIdx++];
  const sub2 = allImageFiles[fileIdx++];

  if (!thumbFile) {
    return res.status(400).json({
      success: false,
      message: "Thumbnail image is required"
    });
  }

  if (!sub1 || !sub2) {
    return res.status(400).json({
      success: false,
      message: "Two sub images are required"
    });
  }

  const addCount = Number(variant.additionalCount) || 0;
  const additionalFiles = allImageFiles.slice(fileIdx, fileIdx + addCount);

  if (additionalFiles.length !== addCount) {
  return res.status(400).json({
    success: false,
    message: "Image upload mismatch"
  });
}

  fileIdx += addCount;

  processedVariants.push({
    language: variant.language,
    thumbnail: {
      url: toUrl(thumbFile),
      publicId: thumbFile.filename
    },
    subImages: [sub1, sub2].map(f => ({
      url: toUrl(f),
      publicId: f.filename
    })),
    additionalImages: additionalFiles.map(f => ({
      url: toUrl(f),
      publicId: f.filename
    })),
    formats: variant.formats.map(f => ({
      format: f.format,
      price: Number(f.price),
      stock: Number(f.stock),
      sold: 0
    }))
  });

}

const newProduct = new Product({
  title: titleTrimmed.toLowerCase(),
  shortDescription: shortDescTrimmed,
  description: descriptionTrimmed,
  category,
  subCategory,
  author,
  variants: processedVariants
});

    await newProduct.save();
    res.status(201).json({ success: true, message: "Product created successfully" });

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const updateProduct = async (req, res) => {
  try {
    const { title, shortDescription, description, category, subCategory, author } = req.body;

    const letterRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const numberRegex = /^[0-9]+$/;

const titleTrimmed = title?.trim();
const shortDescTrimmed = shortDescription?.trim();
const descriptionTrimmed = description?.trim();

if (
  !titleTrimmed ||
  !shortDescTrimmed ||
  !descriptionTrimmed ||
  !category ||
  !subCategory ||
  !author
) {
  return res.status(400).json({
    success: false,
    message: "All fields are required"
  });
}

if (!letterRegex.test(titleTrimmed)) {
  return res.status(400).json({
    success: false,
    message: "Product name should contain only letters with a single space between words."
  });
}

if (!letterRegex.test(shortDescTrimmed)) {
  return res.status(400).json({
    success: false,
    message: "Short description should contain only letters with a single space between words."
  });
}

if (!letterRegex.test(descriptionTrimmed)) {
  return res.status(400).json({
    success: false,
    message: "Description should contain only letters with a single space between words."
  });
}

    const variants = JSON.parse(req.body.variants);

    if (!Array.isArray(variants) || variants.length === 0) {
  return res.status(400).json({
    success: false,
    message: "At least one variant is required"
  });
}

const languageSet = new Set();
for (const variant of variants) {

  if (!variant.language) {
    return res.status(400).json({
      success: false,
      message: "Language is required"
    });
  }

  if (languageSet.has(String(variant.language))) {
    return res.status(400).json({
      success: false,
      message: "Duplicate language is not allowed"
    });
  }

  languageSet.add(String(variant.language));

  let languageExists = await Language.findById(variant.language);

if (!languageExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid language"
  });
}

  if (!variant.formats || variant.formats.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Select at least one format"
    });
  }

  for (const format of variant.formats) {

    const allowedFormats = ["paperback", "hardcover"];

    if (!allowedFormats.includes(format.format)) {
      return res.status(400).json({
        success: false,
        message: "Invalid format"
      });
    }

    if (
      format.price === undefined ||
      format.price === "" ||
      !numberRegex.test(String(format.price)) ||
      Number(format.price) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must contain whole numbers only"
      });
    }

    if (
      format.stock === undefined ||
      format.stock === "" ||
      !numberRegex.test(String(format.stock)) ||
      Number(format.stock) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must contain whole numbers only"
      });
    }

  }
}
    const product = await Product.findById(req.params.id);

    const existingProduct = await Product.findOne({
  title: titleTrimmed.toLowerCase(),
  _id: { $ne: req.params.id }
});

if (existingProduct) {
  return res.status(400).json({
    success: false,
    message: "Product already exists"
  });
}

const categoryExists = await Category.findById(category);

if (!categoryExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid category"
  });
}

const subCategoryExists = await Category.findById(subCategory);

if (!subCategoryExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid sub-category"
  });
}

const authorExists = await Author.findById(author);

if (!authorExists) {
  return res.status(400).json({
    success: false,
    message: "Invalid author"
  });
}

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const allImageFiles = req.files['images'] || [];
    let fileIdx = 0;
    const toUrl = (file) => `/uploads/${file.filename}`;

    const processedVariants = variants.map((variant) => {


      let thumbnail;
      if (variant.newThumbIndex && allImageFiles[fileIdx]) {
  
        thumbnail = {
          url: toUrl(allImageFiles[fileIdx]),
          publicId: allImageFiles[fileIdx].filename
        };
        fileIdx++;
      } else {
        thumbnail = variant.existingThumbnail;
      }

     
      const subImages = [];
      const existingSubs = variant.existingSubImages || [];
      const newSubIndexes = variant.newSubIndexes || {};

      for (let i = 0; i < 2; i++) {
        if (newSubIndexes[i] === true && allImageFiles[fileIdx]) {
          
          subImages.push({
            url: toUrl(allImageFiles[fileIdx]),
            publicId: allImageFiles[fileIdx].filename
          });
          fileIdx++;
        } else {
          
          if (existingSubs[i]?.url) {
            subImages.push(existingSubs[i]);
          }
        }
      }

   
      const existingAdditional = variant.existingAdditionalImages || [];
      const newAddCount = Number(variant.newAdditionalCount) || 0;
      const newAdditionalFiles = allImageFiles.slice(fileIdx, fileIdx + newAddCount);
      fileIdx += newAddCount;

      const additionalImages = [
        ...existingAdditional,
        ...newAdditionalFiles.map(f => ({ url: toUrl(f), publicId: f.filename }))
      ];

      if (!thumbnail) {
  return res.status(400).json({
    success: false,
    message: "Thumbnail image is required"
  });
}

if (subImages.length !== 2) {
  return res.status(400).json({
    success: false,
    message: "Two sub images are required"
  });
}

      return {
        language: variant.language,
        thumbnail,
        subImages,
        additionalImages,
        formats: variant.formats.map(f => ({
          format: f.format,
          price: Number(f.price),
          stock: Number(f.stock),
          sold: f.sold || 0
        }))
      };
    });

    product.title = titleTrimmed.toLowerCase();
    product.shortDescription = shortDescTrimmed;
    product.description = descriptionTrimmed;
    product.category = category;
    product.subCategory = subCategory;
    product.author = author;
    product.variants = processedVariants;

    await product.save();
    res.json({ success: true, message: "Product updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleProductList = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("subCategory")
      .populate("author")

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.isDeleted === true) {
      if (product.category?.isDeleted) {
        return res.status(400).json({ success: false, message: "Cannot list product. Category is unlisted." });
      }
      if (product.subCategory?.isDeleted) {
        return res.status(400).json({ success: false, message: "Cannot list product. Sub-category is unlisted." });
      }
      if (product.author?.isDeleted) {
        return res.status(400).json({ success: false, message: "Cannot list product. Author is unlisted." });
      }
    }

    product.isDeleted = !product.isDeleted;
    await product.save();

    res.json({
      success: true,
      message: product.isDeleted ? "Product unlisted" : "Product listed"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getProductsForOffer = async (req, res) => {
  const products = await Product.find({ isDeleted: false })
    .populate("variants.language", "languageName")
    .select("title variants");

  res.json({ success: true, products });
};

module.exports = {
  productPage,
  getProduct,
  getProductById,
  addProduct,
  updateProduct,
  toggleProductList
}