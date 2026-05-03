const User=require('../../models/User')
const Address=require('../../models/Address')

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getAddresses=async(req,res)=>{
    try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect('/login');
    }

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });
    const user = await User.findById(userId);

    res.render('user/addresses', {
      user,
      addresses
    });

  } catch (error) {
   console.log(error)
    res.status(500).render('error', {
      message: 'Something went wrong'
    });
  }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addAddress=async(req,res)=>{
  try{
    const userId=req.session.userId

    if(!userId){
      return res.status(401).json({
        success:false,
        message:"User not logged in"
      })
    }

    const {
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country,
      type
    } = req.body;

     if (!fullName || !addressLine1 || !city || !state || !zip || !country) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const addressCount=await Address.countDocuments({userId})
    

    const formattedType =
    type.charAt(0).toUpperCase() + type.slice(1);

    const newAddress = new Address({
      userId,
      fullName,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      zip,
      country,
      type:formattedType,
      isPrimary: addressCount === 0 
    });

    await newAddress.save()

     return res.status(201).json({
      success: true,
      message: 'Address added successfully'
    });


  }catch(err){
    console.log(err)
     return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });

  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const editAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not logged in'
      });
    }

    const {
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country,
      type
    } = req.body;

    if (!fullName || !addressLine1 || !city || !state || !zip || !country) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const formattedType =
      type.charAt(0).toUpperCase() + type.slice(1);

    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, userId },  
      {
        fullName,
        addressLine1,
        addressLine2: addressLine2 || '',
        city,
        state,
        zip,
        country,
        type: formattedType
      },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    return res.json({
      success: true,
      message: 'Address updated successfully'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const deleteAddress = async (req, res) => {
  try {
   

    const userId = req.session.userId;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not logged in'
      });
    }

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (address.isPrimary) {
      const next = await Address.findOne({ userId });
      if (next) {
        next.isPrimary = true;
        await next.save();
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getAddressesAPI = async (req, res) => {
  try {
    const userId = req.session.userId;

    const addresses = await Address.find({ userId });

    res.json({
      success: true,
      addresses
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

const setPrimaryAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not logged in'
      });
    }

    
    await Address.updateMany({ userId }, { isPrimary: false });

   
    await Address.findOneAndUpdate(
      { _id: addressId, userId },
      { isPrimary: true }
    );

    return res.json({
      success: true,
      message: 'Primary address updated'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};

////////////////////////////////////////////////////////////////////
module.exports={
    getAddresses,
    addAddress,
    editAddress,
    deleteAddress,
    getAddressesAPI,
    setPrimaryAddress 
}