const sendToken = (
    user,
    statusCode = 200,
    res,
    message = 'User registered successfully'
  ) => {
    const token = user.getJWTToken();
  
    res.status(statusCode).json({
      success: true,
      message,
      user,
      token,
    });
  };
  
  export default sendToken;
  