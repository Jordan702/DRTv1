const validateSwap = (req, res, next) => {
  const requiredFields = ['walletAddress'];
  const missing = requiredFields.filter(f => !req.body[f]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }
  next();
};

router.post('/swapDRTforETH', validateSwap, controller.swapDRTforETH);
router.post('/swapETHforDRT', validateSwap, controller.swapETHforDRT);
