function generateReferralCode(name) {

  const random =
    Math.random().toString(36).substring(2, 6).toUpperCase();

  return (
    name.substring(0, 4).toUpperCase() +
    random
  );
}

module.exports = generateReferralCode;