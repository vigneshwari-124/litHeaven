const Category=require('../../models/Categories')
const Product=require('../../models/Product')
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const categoryPage=(req,res)=>{
    res.render('admin/category')
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addCategory=async(req,res)=>{
    try{
        const {name,description}=req.body

        if(!name || !description ){
            return res.status(400).json({
                success:false,
                message:"Category name and description are required"
            })
        }

         const existingCategory = await Category.findOne({
         name: name.trim().toLowerCase(),
         parentCategory: null,
         isDeleted: { $ne: true }
         });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists",
      });
    }

    const newCategory=new Category({
        name: name.trim().toLowerCase(),
        description,
        parentCategory:null
    })

    await newCategory.save();
        
         res.status(201).json({
         success: true,
         message: "Category added successfully",
         data: newCategory,
         });
    }catch(err){
      res.status(500).json({
      success: false,
      message: "Failed to add category",
    });

    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateCategory = async(req,res)=>{
  try{
    const {id}=req.params;
    const { name, description} = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const nameNormalized = name.trim().toLowerCase();
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const existingCategory = await Category.findOne({
      name: nameNormalized,
      parentCategory: null,
      _id: { $ne: id },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists",
      });
    }

    category.name =nameNormalized;
    category.description = description;
   

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });

  }catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const searchCategories = async (req, res) => {
  try {
    const { query = '', status = 'all' } = req.query
    let page = Number(req.query.page) || 1
    const LIMIT = Number(req.query.limit) || 7
    const skip = (page - 1) * LIMIT

    let filter = {
       parentCategory: null
       }

   
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }

    const total = await Category.countDocuments(filter)

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(LIMIT)

    res.status(200).json({
      success: true,
      categories,
      totalPages: Math.ceil(total / LIMIT),
      currentPage: page,
      total
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false })
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getParentCategories = async (req, res) => {
  try {
    
    const categories = await Category.find({
      parentCategory: null,
      isDeleted: { $ne: true } 
    }).select('_id name');

    res.status(200).json({
      success: true,
      categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleCategoryDelete = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    category.isDeleted = !category.isDeleted;
    await category.save();

    if (category.parentCategory === null) {

      const subCategories = await Category.find({
        parentCategory: category._id
      });

      const subIds = subCategories.map(sub => sub._id);

      await Category.updateMany(
        { parentCategory: category._id },
        { isDeleted: category.isDeleted }
      );

     const result = await Product.updateMany(
{
  $or: [
    { category: category._id },
    { subCategory: { $in: subIds } }
  ]
},
{ isDeleted: category.isDeleted }
);

console.log("Category ID:", category._id);
console.log("SubCategory IDs:", subIds);
console.log("Modified products:", result.modifiedCount);
    }

    res.json({
      success: true,
      isDeleted: category.isDeleted,
      message: category.isDeleted
        ? "Category and related data unlisted"
        : "Category and related data restored"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const subCategoryPage = (req, res) => {
  res.render('admin/sub-category');
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getSubCategories = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let matchStage = {
      parentCategory: { $ne: null }
    };


    const pipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: 'categories',
          localField: 'parentCategory',
          foreignField: '_id',
          as: 'parentCategory'
        }
      },

      { $unwind: '$parentCategory' }
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { 'parentCategory.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    );

    const result = await Category.aggregate(pipeline);

    const subCategories = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      success: true,
      subCategories,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-categories'
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addSubCategory = async (req, res) => {
  try {
    const { name, description, parentCategory} = req.body;

    if (!name || !description || !parentCategory ) {
      return res.status(400).json({
        success: false,
        message: 'All fields required'
      });
    }

     const parent = await Category.findOne({
      _id: parentCategory,
      isDeleted: false
    });

        if (!parent) {
      return res.status(400).json({
        success: false,
        message: 'Parent category is deleted or invalid'
      });
    }


   let imageUrl = null; 

    if  (req.file && req.file.path){
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sub-categories'
      });

      imageUrl = {
          url: result.secure_url,
          public_id: result.public_id
      };

       if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }


    const exists = await Category.findOne({
      name: name.trim().toLowerCase(),
      parentCategory
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Sub-category name already exists under this category'
      });
    }

    const subCategory = new Category({
      name: name.trim().toLowerCase(),
      description,
      parentCategory,
      image: imageUrl
    });

    await subCategory.save();

    res.status(201).json({
      success: true,
      message: 'Sub-category added successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, parentCategory, featured } = req.body

    const subCategory = await Category.findById(id)
    if (!subCategory) {
      return res.status(404).json({ success:false, message:'Sub-category not found' })
    }

    subCategory.name = name?.trim()
    subCategory.description = description
    subCategory.parentCategory = parentCategory
  
    
    subCategory.isFeatured = featured === 'true' || featured === true;
  
    if (req.file) {

      if (subCategory.image?.public_id) {
        await cloudinary.uploader.destroy(subCategory.image.public_id)
      }

       const uploadResult = await cloudinary.uploader.upload(
        req.file.path,
        { folder: 'sub-categories' }
      );

      subCategory.image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      }
    

    if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }


    await subCategory.save()

    res.json({
      success: true,
      message: 'Sub-category updated successfully'
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({
      success:false,
      message:'Server error'
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleFeatured = async (req, res) => {
  try {
    const subCat = await Category.findById(req.params.id);
    if (!subCat) {
      return res.status(404).json({ success: false, message: 'Sub-category not found' });
    }

    subCat.isFeatured = !subCat.isFeatured;
    await subCat.save();

    res.json({ success: true, isFeatured: subCat.isFeatured });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getSubCategoriesForProduct = async (req, res) => {
  try {

    const { categoryId } = req.params;

      if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID required"
      });
    }
    const subCategories = await Category.find({
      parentCategory: categoryId,
      isDeleted: { $ne: true }   
    }).select('_id name');

    res.json({
      success: true,
      subCategories
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleSubCategoryDelete = async (req, res) => {
  try {

    const subCategory = await Category.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found"
      });
    }

    const parent = await Category.findById(subCategory.parentCategory);

    if (subCategory.isDeleted === true && parent?.isDeleted === true) {
      return res.status(400).json({
        success: false,
        message: "Cannot list sub-category while parent category is unlisted"
      });
    }

    subCategory.isDeleted = !subCategory.isDeleted;
    await subCategory.save();

     await Product.updateMany(
      { subCategory: subCategory._id },
      { isDeleted: subCategory.isDeleted }
    );

    res.json({
      success: true,
      isDeleted: subCategory.isDeleted,
      message: subCategory.isDeleted
        ? "Sub-category and related product unlisted"
        : "Sub-category and related product  listed"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
    categoryPage,
    addCategory,
    updateCategory,
    searchCategories,
    subCategoryPage,
    getSubCategories,
    addSubCategory,
    getParentCategories,
    updateSubCategory,
    toggleFeatured ,
    getSubCategoriesForProduct,
    toggleCategoryDelete,
    toggleSubCategoryDelete
}