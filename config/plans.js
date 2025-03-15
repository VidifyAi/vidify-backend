const PLANS = {
  free: {
    name: 'Free',
    monthlyLimit: 5, // 5 videos per month
    videoLengthLimit: 30, // 30 seconds max
    videoQuality: 'standard',
    customizationOptions: ['basic'],
    priority: 'low',
    watermark: true
  },
  basic: {
    name: 'Basic',
    monthlyLimit: 30, // 30 videos per month
    videoLengthLimit: 120, // 2 minutes max
    videoQuality: 'high',
    customizationOptions: ['basic', 'advanced'],
    priority: 'medium',
    watermark: false
  },
  premium: {
    name: 'Premium',
    monthlyLimit: 100, // 100 videos per month
    videoLengthLimit: 300, // 5 minutes max
    videoQuality: 'ultra',
    customizationOptions: ['basic', 'advanced', 'professional'],
    priority: 'high',
    watermark: false
  }
};

module.exports = PLANS;