const Language=require('../../models/Language')

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const languagePage = (req, res) => {
  res.render('admin/language');
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addLanguage = async (req, res) => {
  try {
    const { languageCode, languageName, status } = req.body;

    const exists = await Language.findOne({ languageCode });
    if (exists) {
      return res.status(400).json({
        message: "Language already exists"
      });
    }

    const language = new Language({
      languageCode,
      languageName,
      status
    });

    await language.save();

    res.status(201).json({
      message: "Language added successfully",
      data: language
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getLanguages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const status = req.query.status;

    let filter = {};

    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const total = await Language.countDocuments(filter);

    const languages = await Language.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: languages
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { languageCode, languageName, status } = req.body;

    const language = await Language.findById(id);
    if (!language) {
      return res.status(404).json({ message: "Language not found" });
    }

   
    const duplicate = await Language.findOne({
      languageCode,
      _id: { $ne: id }
    });

    if (duplicate) {
      return res.status(400).json({ message: "Language code already exists" });
    }

    language.languageCode = languageCode;
    language.languageName = languageName;
    language.status = status;

    await language.save();

    res.status(200).json({
      message: "Language updated successfully",
      data: language
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;

    const language = await Language.findById(id);
    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    await Language.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Language deleted successfully'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete language'
    });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getActiveLanguages = async (req, res) => {
  try {
    const languages = await Language.find({ status: 'active' })
      .sort({ languageName: 1 })
      .select('_id languageCode languageName');

    res.status(200).json({
      success: true,
      languages
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch languages'
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
    languagePage,
    addLanguage,
    getLanguages,
    updateLanguage ,
    deleteLanguage,
    getActiveLanguages
   
}