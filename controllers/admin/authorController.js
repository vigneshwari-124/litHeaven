const Author = require('../../models/Author');
const Product = require('../../models/Product');

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const authorPage = (req, res) => {
  res.render('admin/author');
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const searchAuthors = async (req, res) => {
  try {
    const { query = '', page = 1, limit = 7 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (query && query.trim() !== '') {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } }
      ];
    }

    const totalAuthors = await Author.countDocuments(filter);
    const totalPages = Math.ceil(totalAuthors / limitNum);

    const authors = await Author.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      authors,
      currentPage: pageNum,
      totalPages,
      totalAuthors,
      limit: limitNum
    });

  } catch (error) {
    console.error('Search authors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching authors',
      error: error.message
    });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const createAuthor = async (req, res) => {
  try {
    const { name, bio } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Author name is required' });
    }

    if (!bio || !bio.trim()) {
      return res.status(400).json({ success: false, message: 'Author bio is required' });
    }

    const existingAuthor = await Author.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });

    if (existingAuthor) {
      return res.status(400).json({ success: false, message: 'Author already exists' });
    }

    const author = new Author({
      name: name.trim(),
      bio: bio.trim()
    });

    await author.save();

    res.status(201).json({
      success: true,
      message: 'Author created successfully',
      author
    });

  } catch (error) {
    console.error('Create author error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Author already exists' });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating author',
      error: error.message
    });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Author name is required' });
    }

    if (!bio || !bio.trim()) {
      return res.status(400).json({ success: false, message: 'Author bio is required' });
    }

    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author not found' });
    }

    if (name.trim().toLowerCase() !== author.name.toLowerCase()) {
      const existingAuthor = await Author.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: id }
      });

      if (existingAuthor) {
        return res.status(400).json({ success: false, message: 'Author already exists' });
      }
    }

    author.name = name.trim();
    author.bio = bio.trim();

    await author.save();

    res.status(200).json({
      success: true,
      message: 'Author updated successfully',
      author
    });

  } catch (error) {
    console.error('Update author error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Author already exists' });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating author',
      error: error.message
    });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleAuthorDelete = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found'
      });
    }

    author.isDeleted = !author.isDeleted;
    await author.save();

     await Product.updateMany(
      { author: author._id },
      { isDeleted: author.isDeleted }
    )

    res.json({
      success: true,
      isDeleted: author.isDeleted,
      message: author.isDeleted
        ? "Author and related products unlisted"
        : "Author and related products listed"
    });

  } catch (error) {
    console.error('Toggle author delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find({ isDeleted: false })
      .sort({ name: 1 })
      .select('name _id');

    res.status(200).json({
      success: true,
      authors
    });

  } catch (error) {
    console.error('Get all authors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching authors',
      error: error.message
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
  authorPage,
  searchAuthors,
  getAllAuthors,
  createAuthor,
  updateAuthor,
  toggleAuthorDelete
};