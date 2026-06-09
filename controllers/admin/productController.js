const Product = require('../../models/Product')
const Category = require('../../models/Categories');
const Author = require('../../models/Author');
// Cloudinary + sharp REMOVE pannida - local path use pannrom

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

// const addProduct = async (req, res) => {
//   try {
//     const { title, shortDescription, description, category, subCategory, author } = req.body;
//     const variants = JSON.parse(req.body.variants);

//     // req.files['images'] - ippov ellam oru field-la varும்
//     // Each variant = 3 images (index 0 = thumbnail, 1 & 2 = sub images)
//     const allImageFiles = req.files['images'] || [];

//     if (!title || !shortDescription || !description || !category || !subCategory || !author || !variants.length) {
//       return res.status(400).json({ success: false, message: "All required fields must be filled" });
//     }

//     const existing = await Product.findOne({ title: title.trim().toLowerCase() });
//     if (existing) {
//       return res.status(400).json({ success: false, message: "Product already exists" });
//     }

//    // addProduct-la fileIdx logic update:
// let fileIdx = 0;
// const processedVariants = variants.map((variant) => {
//   const thumbFile = allImageFiles[fileIdx++]; // fixed[0]
//   const sub1 = allImageFiles[fileIdx++];      // fixed[1]
//   const sub2 = allImageFiles[fileIdx++];      // fixed[2]

//   // Additional images
//   const addCount = variant.additionalCount || 0;
//   const additionalFiles = allImageFiles.slice(fileIdx, fileIdx + addCount);
//   fileIdx += addCount;

//   const toUrl = (file) => file ? `/uploads/${file.filename}` : null;

//   return {
//     language: variant.language,
//     thumbnail: { url: toUrl(thumbFile), publicId: thumbFile?.filename },
//     subImages: [sub1, sub2].filter(Boolean).map(f => ({ url: toUrl(f), publicId: f.filename })),
//     additionalImages: additionalFiles.map(f => ({ url: toUrl(f), publicId: f.filename })),
//     formats: variant.formats.map(f => ({
//       format: f.format, price: Number(f.price), stock: Number(f.stock), sold: 0
//     }))
//   };
// });
//     const newProduct = new Product({
//       title,
//       shortDescription,
//       description,
//       category,
//       subCategory,
//       author,
//       variants: processedVariants
//     });

//     await newProduct.save();

//     res.status(201).json({ success: true, message: "Product created successfully" });

//   } catch (error) {
//     console.error("ADD PRODUCT ERROR:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const addProduct = async (req, res) => {
  try {
    const { title, shortDescription, description, category, subCategory, author } = req.body;
    const variants = JSON.parse(req.body.variants);
    const allImageFiles = req.files['images'] || [];

    if (!title || !shortDescription || !description || !category || !subCategory || !author || !variants.length) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const existing = await Product.findOne({ title: title.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Product already exists" });
    }

    let fileIdx = 0;
    const toUrl = (file) => file ? `/uploads/${file.filename}` : null;

    const processedVariants = variants.map((variant) => {
      // fixed: thumb(1) + sub1(1) + sub2(1) = 3 files
      const thumbFile = allImageFiles[fileIdx++];
      const sub1      = allImageFiles[fileIdx++];
      const sub2      = allImageFiles[fileIdx++];

      // additional: additionalCount files
      const addCount = Number(variant.additionalCount) || 0;
      const additionalFiles = allImageFiles.slice(fileIdx, fileIdx + addCount);
      fileIdx += addCount;

      if (!thumbFile) throw new Error("Thumbnail missing for a variant");

      return {
        language: variant.language,
        thumbnail: {
          url: toUrl(thumbFile),
          publicId: thumbFile.filename
        },
        subImages: [sub1, sub2].filter(Boolean).map(f => ({
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
      };
    });

    const newProduct = new Product({
      title, shortDescription, description,
      category, subCategory, author,
      variants: processedVariants
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: "Product created successfully" });

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// const updateProduct = async (req, res) => {
//   try {
//     const { title, shortDescription, description, category, subCategory, author } = req.body;

//     if (!title || !shortDescription || !description || !category || !subCategory || !author) {
//       return res.status(400).json({ success: false, message: "All fields are required" });
//     }

//     const variants = JSON.parse(req.body.variants);
//     const product = await Product.findById(req.params.id);
//     if (!product) {
//       return res.status(404).json({ success: false, message: "Product not found" });
//     }

//     const allImageFiles = req.files['images'] || [];
//     let fileIdx = 0;

//     const processedVariants = variants.map((variant) => {
//       const toUrl = (file) => `/uploads/${file.filename}`;

//       let thumbnail;
//       if (variant.newThumbIndex && allImageFiles[fileIdx]) {
//         // New thumbnail upload
//         thumbnail = {
//           url: toUrl(allImageFiles[fileIdx]),
//           publicId: allImageFiles[fileIdx].filename
//         };
//         fileIdx++;
//       } else {
//         thumbnail = variant.existingThumbnail;
//       }

//       // Sub images: existing keep pannrom, new ones add pannrom
//       const subImages = [];
//       const existingSubs = variant.existingSubImages || [];

//       for (let i = 0; i < 2; i++) { // Only 2 sub images now
//         if (existingSubs[i]?.url) {
//           subImages.push(existingSubs[i]);
//         } else if (allImageFiles[fileIdx]) {
//           subImages.push({
//             url: toUrl(allImageFiles[fileIdx]),
//             publicId: allImageFiles[fileIdx].filename
//           });
//           fileIdx++;
//         }
//       }

//       return {
//         language: variant.language,
//         thumbnail,
//         subImages,
//         formats: variant.formats.map(f => ({
//           format: f.format,
//           price: Number(f.price),
//           stock: Number(f.stock),
//           sold: f.sold || 0
//         }))
//       };
//     });

//     product.title = title;
//     product.shortDescription = shortDescription;
//     product.description = description;
//     product.category = category;
//     product.subCategory = subCategory;
//     product.author = author;
//     product.variants = processedVariants;

//     await product.save();

//     res.json({ success: true, message: "Product updated successfully" });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const updateProduct = async (req, res) => {
  try {
    const { title, shortDescription, description, category, subCategory, author } = req.body;

    if (!title || !shortDescription || !description || !category || !subCategory || !author) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const variants = JSON.parse(req.body.variants);
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const allImageFiles = req.files['images'] || [];
    let fileIdx = 0;
    const toUrl = (file) => `/uploads/${file.filename}`;

    const processedVariants = variants.map((variant) => {

      // ── Thumbnail ──
      let thumbnail;
      if (variant.newThumbIndex && allImageFiles[fileIdx]) {
        // New file uploaded — use it
        thumbnail = {
          url: toUrl(allImageFiles[fileIdx]),
          publicId: allImageFiles[fileIdx].filename
        };
        fileIdx++;
      } else {
        // No new file — keep existing thumbnail as-is
        thumbnail = variant.existingThumbnail;
      }

      // ── Sub images (always keep 2) ──
      const subImages = [];
      const existingSubs = variant.existingSubImages || [];
      const newSubIndexes = variant.newSubIndexes || {};

      for (let i = 0; i < 2; i++) {
        if (newSubIndexes[i] === true && allImageFiles[fileIdx]) {
          // This slot has a new file — replace
          subImages.push({
            url: toUrl(allImageFiles[fileIdx]),
            publicId: allImageFiles[fileIdx].filename
          });
          fileIdx++;
        } else {
          // No new file for this slot — keep existing
          if (existingSubs[i]?.url) {
            subImages.push(existingSubs[i]);
          }
        }
      }

      // ── Additional images ──
      const existingAdditional = variant.existingAdditionalImages || [];
      const newAddCount = Number(variant.newAdditionalCount) || 0;
      const newAdditionalFiles = allImageFiles.slice(fileIdx, fileIdx + newAddCount);
      fileIdx += newAddCount;

      const additionalImages = [
        ...existingAdditional,
        ...newAdditionalFiles.map(f => ({ url: toUrl(f), publicId: f.filename }))
      ];

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

    product.title = title;
    product.shortDescription = shortDescription;
    product.description = description;
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