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

    let {
       fullName,
       addressLine1,
       addressLine2,
       city,
       state,
       zip,
       country,
       type
    } = req.body;

    fullName = fullName.trim();
    addressLine1 = addressLine1.trim();
    addressLine2 = addressLine2 ? addressLine2.trim() : "";
    city = city.trim();
    state = state.trim();
    country = country.trim();
    zip = zip.trim();

     if (!fullName || !addressLine1 || !city || !state || !zip || !country) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!nameRegex.test(fullName)) {
  return res.status(400).json({
    success: false,
    message: "Name should contain only letters"
  });
}

const addressRegex = /^[A-Za-z0-9/,-]+(?: [A-Za-z0-9/,-]+)*$/; 

if (!addressRegex.test(addressLine1)) {
  return res.status(400).json({
    success: false,
    message: "Invalid Address Line 1"
  });
}

if (addressLine2 && !addressRegex.test(addressLine2)) {
  return res.status(400).json({
    success: false,
    message: "Invalid Address Line 2"
  });
}

const cityRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
if (!cityRegex.test(city)) {
  return res.status(400).json({
    success: false,
    message: "City should contain only letters"
  });
}

const stateRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
if (!stateRegex.test(state)) {
  return res.status(400).json({
    success: false,
    message: "State should contain only letters"
  });
}

const countryRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
if (!countryRegex.test(country)) {
  return res.status(400).json({
    success: false,
    message: "Country should contain only letters"
  });
}

const pinRegex = /^[0-9]{6}$/;
if (!pinRegex.test(zip)) {
  return res.status(400).json({
    success: false,
    message: "Pincode must be exactly 6 digits"
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

    let {
  fullName,
  addressLine1,
  addressLine2,
  city,
  state,
  zip,
  country,
  type
} = req.body;

fullName = fullName.trim();
addressLine1 = addressLine1.trim();
addressLine2 = addressLine2 ? addressLine2.trim() : "";
city = city.trim();
state = state.trim();
country = country.trim();
zip = zip.trim();



    if (!fullName || !addressLine1 || !city || !state || !zip || !country) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    if (!nameRegex.test(fullName)) {
    return res.status(400).json({
        success: false,
        message: "Name should contain only letters"
    });
}

const addressRegex = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/;
if (!addressRegex.test(addressLine1)) {
    return res.status(400).json({
        success: false,
        message: "Address should contain only letters and numbers"
    });
}

if (addressLine2 && !addressRegex.test(addressLine2)) {
    return res.status(400).json({
        success: false,
        message: "Address should contain only letters and numbers"
    });
}

const cityRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
if (!cityRegex.test(city)) {
    return res.status(400).json({
        success: false,
        message: "City should contain only letters"
    });
}

const stateRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
if (!stateRegex.test(state)) {
    return res.status(400).json({
        success: false,
        message: "State should contain only letters"
    });
}

const countryRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
if (!countryRegex.test(country)) {
    return res.status(400).json({
        success: false,
        message: "Country should contain only letters"
    });
}

const pinRegex = /^[0-9]{6}$/;
if (!pinRegex.test(zip)) {
    return res.status(400).json({
        success: false,
        message: "Pincode must be exactly 6 digits"
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