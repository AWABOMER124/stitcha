export type Locale = 'ar' | 'en';

export const LOCALE_COOKIE = 'waslak_locale';
export const DEFAULT_LOCALE: Locale = 'ar';

export interface Dictionary {
  common: {
    signIn: string;
    signingIn: string;
    email: string;
    emailOrPhone: string;
    phone: string;
    password: string;
    confirmPassword: string;
    continue: string;
    cancel: string;
    or: string;
    somethingWrong: string;
    loading: string;
  };
  login: {
    welcomeBack: string;
    subtitle: string;
    forgotPassword: string;
    invalidCredentials: string;
    noAccount: string;
    createMerchantAccount: string;
    areYouDistributor: string;
    registerHere: string;
  };
  register: {
    title: string;
    subtitle: string;
    businessType: string;
    businessName: string;
    businessNamePlaceholder: string;
    yourName: string;
    fullNamePlaceholder: string;
    phonePlaceholder: string;
    passwordsNoMatch: string;
    creatingStore: string;
    createAccount: string;
    alreadyHaveAccount: string;
    signIn: string;
    types: {
      RESTAURANT: string;
      CAFE: string;
      GROCERY: string;
      PHARMACY: string;
      RETAIL: string;
      OTHER: string;
    };
  };
  registerDistributor: {
    title: string;
    subtitle: string;
    distributorName: string;
    whatsappPhone: string;
    creatingAccount: string;
    alreadyHaveAccount: string;
    signIn: string;
  };
  otp: {
    title: string;
    subtitlePrefix: string;
    verificationCode: string;
    confirm: string;
    verifying: string;
    resend: string;
  };
  completeRegistration: {
    title: string;
    businessType: string;
    invalidLink: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    sendLink: string;
    sending: string;
    sentPrefix: string;
    sentSuffix: string;
    backToSignIn: string;
    remembered: string;
  };
  resetPassword: {
    title: string;
    subtitle: string;
    newPassword: string;
    confirmNewPassword: string;
    updatePassword: string;
    updating: string;
    updated: string;
    missingToken: string;
    backToSignIn: string;
  };
  topbar: {
    searchPlaceholder: string;
    notifications: string;
    logout: string;
    platformOwner: string;
    merchantOwner: string;
    viewStorefront: string;
  };
  navDashboard: {
    home: string;
    fulfillment: string;
    orders: string;
    products: string;
    categories: string;
    inventory: string;
    storefrontSection: string;
    storefrontSettings: string;
    customize: string;
    aiGenerator: string;
    inbox: string;
    financeSection: string;
    financeDashboard: string;
    transactions: string;
    settlements: string;
    crmSection: string;
    crm: string;
    promos: string;
    loyalty: string;
    operationsSection: string;
    branches: string;
    staff: string;
    delivery: string;
    reports: string;
    notifications: string;
    settings: string;
  };
  navDistributor: {
    myDataSection: string;
    dashboard: string;
    merchants: string;
    users: string;
    dispatch: string;
    operationsSection: string;
    orders: string;
    approvals: string;
    drivers: string;
    deliveryCompanies: string;
    deliveryCompaniesList: string;
    assignDrivers: string;
    financeSection: string;
    finance: string;
    financeDashboard: string;
    commissionPlans: string;
    settlements: string;
    priceLists: string;
    settingsSection: string;
    generalSettings: string;
    exportData: string;
  };
  navAdmin: {
    generalSection: string;
    dashboard: string;
    entitiesSection: string;
    distributors: string;
    merchants: string;
    financeReportsSection: string;
    finance: string;
    systemSection: string;
    users: string;
    settings: string;
  };
  dashboardHome: {
    title: string;
    subtitle: string;
    todaysOrders: string;
    todaysRevenue: string;
    pendingOrders: string;
    lowStockItems: string;
    recentOrders: string;
    recentOrdersSubtitle: string;
    viewAll: string;
    noOrdersToday: string;
    unknownCustomer: string;
  };
  distributorHome: {
    subtitle: string;
    totalMerchants: string;
    activeMerchants: string;
    inactive: string;
    quickActions: string;
    addMerchant: string;
    viewAllMerchants: string;
  };
  adminHome: {
    title: string;
    subtitle: string;
    distributors: string;
    active: string;
    pendingApproval: string;
    merchants: string;
    thisMonth: string;
    orders: string;
    completed: string;
    totalRevenue: string;
    activeDistributor: string;
    suspended: string;
    recentDistributors: string;
    recentMerchants: string;
    recentOrders: string;
    viewAll: string;
    none: string;
    pending: string;
    manageDistributors: string;
    manageMerchants: string;
    finance: string;
    platformUsers: string;
    orderStatus: {
      PENDING: string;
      CONFIRMED: string;
      PREPARING: string;
      READY: string;
      OUT_FOR_DELIVERY: string;
      DELIVERED: string;
      CANCELLED: string;
    };
  };
  approvals: {
    title: string;
    subtitle: string;
    empty: string;
    colMerchant: string;
    colStoreType: string;
    colContact: string;
    colInviteStatus: string;
    colApplied: string;
    colAction: string;
    inviteExpired: string;
    inviteAwaiting: string;
    resendInvite: string;
    resending: string;
    resendSuccess: string;
    resendFailed: string;
  };
  distributorSettings: {
    title: string;
    subtitle: string;
    profile: string;
    slugStatusLine: string;
    name: string;
    phone: string;
    email: string;
    save: string;
    saving: string;
    saved: string;
  };
  exportData: {
    title: string;
    subtitle: string;
    merchants: string;
    merchantsDesc: string;
    drivers: string;
    driversDesc: string;
    orders: string;
    ordersDesc: string;
    download: string;
  };
  crud: {
    cancel: string;
    save: string;
    saving: string;
    create: string;
    edit: string;
    delete: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    status: string;
    active: string;
    inactive: string;
  };
  branchesPage: {
    title: string;
    subtitle: string;
    addBranch: string;
    editBranch: string;
    newBranch: string;
    empty: string;
    emptySubtitle: string;
    main: string;
    setAsMain: string;
    cannotDeleteMain: string;
    confirmDelete: string;
  };
  customersPage: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    addCustomer: string;
    editCustomer: string;
    newCustomer: string;
    empty: string;
    emptySubtitle: string;
    colName: string;
    colContact: string;
    colSegment: string;
    colOrders: string;
    colTotalSpent: string;
    segments: {
      NEW: string;
      REGULAR: string;
      VIP: string;
      INACTIVE: string;
      BLOCKED: string;
    };
  };
  staffPage: {
    title: string;
    subtitle: string;
    inviteStaff: string;
    inviteTitle: string;
    sendInvite: string;
    sending: string;
    invitedMessage: string;
    empty: string;
    colName: string;
    colContact: string;
    colRole: string;
    colStatus: string;
    you: string;
    owner: string;
    removed: string;
    remove: string;
    confirmRemove: string;
    roles: {
      MERCHANT_ADMIN: string;
      BRANCH_MANAGER: string;
      CASHIER: string;
      INVENTORY_MANAGER: string;
      DELIVERY_STAFF: string;
      CUSTOMER_SERVICE: string;
      FINANCE_AGENT: string;
    };
  };
  categoriesPage: {
    title: string;
    subtitle: string;
    addCategory: string;
    editCategory: string;
    newCategory: string;
    categoryName: string;
    categoryNamePlaceholder: string;
    create: string;
    productsCount: string;
    empty: string;
    emptySubtitle: string;
    confirmDelete: string;
  };
  inventoryPage: {
    title: string;
    subtitle: string;
    totalTracked: string;
    lowStock: string;
    outOfStock: string;
    empty: string;
    emptySubtitle: string;
    colProduct: string;
    colAvailable: string;
    colReserved: string;
    colThreshold: string;
    colStatus: string;
    colAction: string;
    adjust: string;
    quantityLabel: string;
    quantityPlaceholder: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    save: string;
    saving: string;
    invalidQuantity: string;
    reasonRequired: string;
    statusOk: string;
    statusLow: string;
    statusOut: string;
  };
  deliveryPage: {
    title: string;
    subtitle: string;
    empty: string;
    emptySubtitle: string;
    colOrder: string;
    colCustomer: string;
    colDriver: string;
    colStatus: string;
    reassign: string;
    assignDriver: string;
    driverNameRequired: string;
    driverNameLabel: string;
    driverPhoneLabel: string;
    save: string;
    saving: string;
    statuses: {
      PENDING: string;
      ASSIGNED: string;
      PICKED_UP: string;
      IN_TRANSIT: string;
      DELIVERED: string;
      FAILED: string;
    };
  };
  notificationsPage: {
    title: string;
    subtitle: string;
    all: string;
    unread: string;
    markAllRead: string;
    markRead: string;
    emptyAll: string;
    emptyUnread: string;
    emptySubtitle: string;
    showing: string;
    types: {
      NEW_ORDER: string;
      ORDER_STATUS: string;
      LOW_STOCK: string;
      SYSTEM: string;
    };
  };
  ordersPage: {
    title: string;
    subtitle: string;
    loadFailed: string;
    empty: string;
    pickup: string;
    delivery: string;
    viewDetails: string;
    unknownCustomer: string;
    nextStatusLabel: {
      NEW: string;
      ACCEPTED: string;
      PREPARING: string;
      READY: string;
      OUT_FOR_DELIVERY: string;
    };
    statusLabel: {
      NEW: string;
      ACCEPTED: string;
      PREPARING: string;
      READY: string;
      OUT_FOR_DELIVERY: string;
      DELIVERED: string;
      CANCELLED: string;
      REJECTED: string;
    };
  };
  productsPage: {
    title: string;
    subtitle: string;
    addProduct: string;
    loadFailed: string;
    empty: string;
    addFirst: string;
    colProduct: string;
    colPrice: string;
    colStatus: string;
    colActions: string;
    sku: string;
    active: string;
    inactive: string;
    edit: string;
    activate: string;
    deactivate: string;
    delete: string;
    countSuffix: string;
    totalSuffix: string;
  };
  crmPage: {
    title: string;
    subtitle: string;
    allCustomers: string;
    totalCustomers: string;
    vip: string;
    regular: string;
    inactive: string;
    customersTitle: string;
    customersDesc: string;
    promosTitle: string;
    promosDesc: string;
    loyaltyTitle: string;
    loyaltyDesc: string;
    topCustomers: string;
    viewAll: string;
    ordersSuffix: string;
  };
  promosPage: {
    breadcrumb: string;
    title: string;
    newCode: string;
    createTitle: string;
    code: string;
    discountType: string;
    value: string;
    minOrder: string;
    minOrderOptional: string;
    usageLimit: string;
    unlimited: string;
    expiresAt: string;
    create: string;
    creating: string;
    empty: string;
    emptySubtitle: string;
    expired: string;
    active: string;
    stopped: string;
    freeDeliveryLabel: string;
    usage: string;
    minLabel: string;
    expires: string;
    stop: string;
    activate: string;
    delete: string;
    confirmDelete: string;
    promoTypes: {
      PERCENTAGE: string;
      FIXED_AMOUNT: string;
      FREE_DELIVERY: string;
    };
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      email: 'Email',
      emailOrPhone: 'Email or Phone',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm password',
      continue: 'Continue',
      cancel: 'Cancel',
      or: 'or',
      somethingWrong: 'Something went wrong. Please try again.',
      loading: 'Loading...',
    },
    login: {
      welcomeBack: 'Welcome back',
      subtitle: 'Sign in to your Waslak Merchant OS account',
      forgotPassword: 'Forgot password?',
      invalidCredentials: 'Invalid email/phone or password',
      noAccount: "Don't have an account?",
      createMerchantAccount: 'Create merchant account',
      areYouDistributor: 'Are you a distributor?',
      registerHere: 'Register here',
    },
    register: {
      title: 'Create your store',
      subtitle: 'Start selling online in minutes with Waslak',
      businessType: 'Business Type',
      businessName: 'Business Name',
      businessNamePlaceholder: 'Your Store Name',
      yourName: 'Your Name',
      fullNamePlaceholder: 'Full Name',
      phonePlaceholder: '+249 912 345 678',
      passwordsNoMatch: 'Passwords do not match',
      creatingStore: 'Creating your store...',
      createAccount: 'Create merchant account',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
      types: {
        RESTAURANT: '🍽️ Restaurant',
        CAFE: '☕ Cafe',
        GROCERY: '🛒 Grocery',
        PHARMACY: '💊 Pharmacy',
        RETAIL: '🏪 Retail Store',
        OTHER: '📦 Other',
      },
    },
    registerDistributor: {
      title: 'Register as a Distributor',
      subtitle: 'Create your distributor account with your phone number',
      distributorName: 'Distributor / Company name',
      whatsappPhone: 'Phone number (WhatsApp)',
      creatingAccount: 'Creating account...',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
    },
    otp: {
      title: 'Confirm your phone',
      subtitlePrefix: 'We sent a 6-digit code via WhatsApp to',
      verificationCode: 'Verification code',
      confirm: 'Confirm',
      verifying: 'Verifying...',
      resend: 'Resend code',
    },
    completeRegistration: {
      title: 'Complete your store setup',
      businessType: 'Business type',
      invalidLink: 'Invalid or already-used registration link',
    },
    forgotPassword: {
      title: 'Forgot password?',
      subtitle: "Enter your email and we'll send you a reset link",
      sendLink: 'Send reset link',
      sending: 'Sending...',
      sentPrefix: 'If an account exists for',
      sentSuffix: 'a reset link has been sent.',
      backToSignIn: 'Back to sign in',
      remembered: 'Remembered your password?',
    },
    resetPassword: {
      title: 'Reset your password',
      subtitle: 'Choose a new password for your account',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      updatePassword: 'Update password',
      updating: 'Updating...',
      updated: 'Password updated. Redirecting to sign in...',
      missingToken: 'This reset link is missing its token. Please request a new one.',
      backToSignIn: 'Back to sign in',
    },
    topbar: {
      searchPlaceholder: 'Search orders, products...',
      notifications: 'Notifications',
      logout: 'Log out',
      platformOwner: 'Platform Owner',
      merchantOwner: 'Merchant Owner',
      viewStorefront: 'View Storefront',
    },
    navDashboard: {
      home: 'Home',
      fulfillment: 'Fulfillment',
      orders: 'Orders',
      products: 'Products',
      categories: 'Categories',
      inventory: 'Inventory',
      storefrontSection: 'Online Store',
      storefrontSettings: 'Storefront Settings',
      customize: 'Customize Branding',
      aiGenerator: 'AI Generator',
      inbox: 'Inbox',
      financeSection: 'Finance',
      financeDashboard: 'Finance Dashboard',
      transactions: 'Transactions',
      settlements: 'Settlements',
      crmSection: 'Customers',
      crm: 'CRM',
      promos: 'Promo Codes',
      loyalty: 'Loyalty Points',
      operationsSection: 'Operations',
      branches: 'Branches',
      staff: 'Staff',
      delivery: 'Delivery',
      reports: 'Reports',
      notifications: 'Notifications',
      settings: 'Settings',
    },
    navDistributor: {
      myDataSection: 'My Data',
      dashboard: 'Overview',
      merchants: 'Merchants',
      users: 'Users',
      dispatch: 'Dispatch Board',
      operationsSection: 'Orders & Operations',
      orders: 'Orders',
      approvals: 'Approvals',
      drivers: 'Drivers',
      deliveryCompanies: 'Delivery Companies',
      deliveryCompaniesList: 'Companies List',
      assignDrivers: 'Assign Drivers',
      financeSection: 'Finance',
      finance: 'Finance',
      financeDashboard: 'Finance Dashboard',
      commissionPlans: 'Commission Plans',
      settlements: 'Settlements',
      priceLists: 'Price Lists',
      settingsSection: 'Settings',
      generalSettings: 'General Settings',
      exportData: 'Export Data',
    },
    navAdmin: {
      generalSection: 'General',
      dashboard: 'Dashboard',
      entitiesSection: 'Entities',
      distributors: 'Distributors',
      merchants: 'Merchants',
      financeReportsSection: 'Finance & Reports',
      finance: 'Finance',
      systemSection: 'System',
      users: 'Users',
      settings: 'Settings',
    },
    dashboardHome: {
      title: 'Dashboard',
      subtitle: "Overview of your store's performance today",
      todaysOrders: "Today's Orders",
      todaysRevenue: "Today's Revenue",
      pendingOrders: 'Pending Orders',
      lowStockItems: 'Low Stock Items',
      recentOrders: 'Recent Orders',
      recentOrdersSubtitle: 'Latest orders from your store',
      viewAll: 'View all →',
      noOrdersToday: 'No orders yet today',
      unknownCustomer: 'Unknown',
    },
    distributorHome: {
      subtitle: 'Distributor Dashboard',
      totalMerchants: 'Total Merchants',
      activeMerchants: 'Active Merchants',
      inactive: 'Inactive',
      quickActions: 'Quick Actions',
      addMerchant: '+ Add Merchant',
      viewAllMerchants: 'View All Merchants',
    },
    adminHome: {
      title: 'Platform Dashboard',
      subtitle: "A full overview of Waslak's performance",
      distributors: 'Distributors',
      active: 'active',
      pendingApproval: 'pending approval',
      merchants: 'Merchants',
      thisMonth: 'this month',
      orders: 'Orders',
      completed: 'completed',
      totalRevenue: 'Total Revenue',
      activeDistributor: 'Active distributors',
      suspended: 'Suspended',
      recentDistributors: 'Recent Distributors',
      recentMerchants: 'Recent Merchants',
      recentOrders: 'Recent Orders',
      viewAll: 'View all ←',
      none: 'None yet',
      pending: 'Pending',
      manageDistributors: 'Manage Distributors',
      manageMerchants: 'Manage Merchants',
      finance: 'Finance',
      platformUsers: 'Platform Users',
      orderStatus: {
        PENDING: 'Pending',
        CONFIRMED: 'Confirmed',
        PREPARING: 'Preparing',
        READY: 'Ready',
        OUT_FOR_DELIVERY: 'Out for delivery',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled',
      },
    },
    approvals: {
      title: 'Approvals',
      subtitle: "Merchants who were invited but haven't finished setting up their store yet",
      empty: "No pending approvals — you're all caught up.",
      colMerchant: 'Merchant',
      colStoreType: 'Store Type',
      colContact: 'Contact',
      colInviteStatus: 'Invite status',
      colApplied: 'Applied',
      colAction: 'Action',
      inviteExpired: 'Invite link expired',
      inviteAwaiting: 'Awaiting merchant completion',
      resendInvite: 'Resend invite',
      resending: 'Sending...',
      resendSuccess: 'Invite resent via WhatsApp',
      resendFailed: 'Failed to resend',
    },
    distributorSettings: {
      title: 'Settings',
      subtitle: 'Manage your distributor profile',
      profile: 'Distributor Profile',
      slugStatusLine: 'Slug: {slug} · Status: {status} · Commission: {rate}%',
      name: 'Distributor / Company name',
      phone: 'Phone',
      email: 'Email',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved',
    },
    exportData: {
      title: 'Export Data',
      subtitle: 'Download your data as CSV files',
      merchants: 'Merchants',
      merchantsDesc: 'Every merchant under your account — name, contact, status',
      drivers: 'Drivers',
      driversDesc: 'Your driver roster — contact, vehicle, delivery count',
      orders: 'Orders',
      ordersDesc: 'Recent orders across all your merchants (last 5,000)',
      download: 'Download CSV',
    },
    crud: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      create: 'Create',
      edit: 'Edit',
      delete: 'Delete',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      notes: 'Notes',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
    },
    branchesPage: {
      title: 'Branches',
      subtitle: 'Manage your store branches and locations',
      addBranch: '+ Add Branch',
      editBranch: 'Edit branch',
      newBranch: 'New branch',
      empty: 'No branches yet',
      emptySubtitle: 'Add your first branch/location',
      main: 'Main',
      setAsMain: 'Set as main',
      cannotDeleteMain: 'Cannot delete the main branch',
      confirmDelete: 'Delete "{name}"?',
    },
    customersPage: {
      title: 'Customers',
      subtitle: 'Manage your customer directory',
      searchPlaceholder: 'Search by name, phone, or email',
      addCustomer: '+ Add Customer',
      editCustomer: 'Edit customer',
      newCustomer: 'New customer',
      empty: 'No customers yet',
      emptySubtitle: 'Customers are also added automatically when they place an order',
      colName: 'Name',
      colContact: 'Phone / Email',
      colSegment: 'Segment',
      colOrders: 'Orders',
      colTotalSpent: 'Total Spent',
      segments: { NEW: 'New', REGULAR: 'Regular', VIP: 'VIP', INACTIVE: 'Inactive', BLOCKED: 'Blocked' },
    },
    staffPage: {
      title: 'Staff',
      subtitle: 'Manage your team and their access',
      inviteStaff: '+ Invite Staff',
      inviteTitle: 'Invite a team member',
      sendInvite: 'Send invite',
      sending: 'Sending...',
      invitedMessage: 'Invited {email} — refresh to see them once they accept',
      empty: 'No team members yet',
      colName: 'Name',
      colContact: 'Email / Phone',
      colRole: 'Role',
      colStatus: 'Status',
      you: '(you)',
      owner: 'Owner',
      removed: 'Removed',
      remove: 'Remove',
      confirmRemove: "Remove this staff member's access?",
      roles: {
        MERCHANT_ADMIN: 'Admin',
        BRANCH_MANAGER: 'Branch Manager',
        CASHIER: 'Cashier',
        INVENTORY_MANAGER: 'Inventory Manager',
        DELIVERY_STAFF: 'Delivery Staff',
        CUSTOMER_SERVICE: 'Customer Service',
        FINANCE_AGENT: 'Finance Agent',
      },
    },
    categoriesPage: {
      title: 'Categories',
      subtitle: 'Organize your products into categories',
      addCategory: '+ Add Category',
      editCategory: 'Edit category',
      newCategory: 'New category',
      categoryName: 'Category name *',
      categoryNamePlaceholder: 'e.g. Main Dishes',
      create: 'Create',
      productsCount: '{count} products',
      empty: 'No categories yet',
      emptySubtitle: 'Add your first category to organize your products',
      confirmDelete: 'Delete category "{name}"?',
    },
    inventoryPage: {
      title: 'Inventory',
      subtitle: 'Track product quantities and low-stock alerts',
      totalTracked: 'Total tracked products',
      lowStock: 'Low stock',
      outOfStock: 'Out of stock',
      empty: 'No tracked products yet',
      emptySubtitle: 'Inventory is created automatically when you add a new product',
      colProduct: 'Product',
      colAvailable: 'Available',
      colReserved: 'Reserved',
      colThreshold: 'Threshold',
      colStatus: 'Status',
      colAction: 'Action',
      adjust: 'Adjust',
      quantityLabel: 'Quantity (+ add / - subtract)',
      quantityPlaceholder: 'e.g. 10 or -5',
      reasonLabel: 'Reason',
      reasonPlaceholder: 'e.g. new stock, damage, count',
      save: 'Save',
      saving: 'Saving...',
      invalidQuantity: 'Enter a valid quantity (positive to add, negative to subtract)',
      reasonRequired: 'Reason is required',
      statusOk: 'In stock',
      statusLow: 'Low',
      statusOut: 'Out',
    },
    deliveryPage: {
      title: 'Delivery',
      subtitle: 'Track active deliveries and assign drivers',
      empty: 'No active deliveries',
      emptySubtitle: 'Deliveries appear here once an order needs one',
      colOrder: 'Order',
      colCustomer: 'Customer',
      colDriver: 'Driver',
      colStatus: 'Status',
      reassign: 'Reassign',
      assignDriver: 'Assign driver',
      driverNameRequired: 'Driver name and phone are required',
      driverNameLabel: 'Driver name',
      driverPhoneLabel: 'Driver phone',
      save: 'Save',
      saving: 'Saving...',
      statuses: {
        PENDING: 'Pending', ASSIGNED: 'Assigned', PICKED_UP: 'Picked up', IN_TRANSIT: 'In transit', DELIVERED: 'Delivered', FAILED: 'Failed',
      },
    },
    notificationsPage: {
      title: 'Notifications',
      subtitle: 'Stay updated on orders, stock, and system events',
      all: 'All',
      unread: 'Unread',
      markAllRead: 'Mark all as read',
      markRead: 'Mark as read',
      emptyAll: 'No notifications yet',
      emptyUnread: 'No unread notifications',
      emptySubtitle: 'Order alerts, stock alerts, and system notifications will appear here',
      showing: 'Showing {shown} of {total} notifications',
      types: {
        NEW_ORDER: 'New order',
        ORDER_STATUS: 'Order update',
        LOW_STOCK: 'Low stock',
        SYSTEM: 'System',
      },
    },
    ordersPage: {
      title: 'Orders',
      subtitle: 'Manage incoming and active orders',
      loadFailed: 'Failed to load orders',
      empty: 'No orders found',
      pickup: '🏪 Pickup',
      delivery: '🚚 Delivery',
      viewDetails: 'View Details',
      unknownCustomer: 'Unknown',
      nextStatusLabel: {
        NEW: 'Accept',
        ACCEPTED: 'Start Preparing',
        PREPARING: 'Mark Ready',
        READY: 'Out for Delivery',
        OUT_FOR_DELIVERY: 'Mark Delivered',
      },
      statusLabel: {
        NEW: 'New', ACCEPTED: 'Accepted', PREPARING: 'Preparing', READY: 'Ready',
        OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REJECTED: 'Rejected',
      },
    },
    productsPage: {
      title: 'Products',
      subtitle: 'Manage your product catalog',
      addProduct: '+ Add Product',
      loadFailed: 'Failed to load products',
      empty: 'No products found',
      addFirst: 'Add your first product →',
      colProduct: 'Product',
      colPrice: 'Price',
      colStatus: 'Status',
      colActions: 'Actions',
      sku: 'SKU',
      active: 'Active',
      inactive: 'Inactive',
      edit: 'Edit',
      activate: 'Activate',
      deactivate: 'Deactivate',
      delete: 'Delete',
      countSuffix: 'products',
      totalSuffix: 'total',
    },
    crmPage: {
      title: 'Customer Management',
      subtitle: 'Your customer base · discounts · loyalty',
      allCustomers: 'All Customers',
      totalCustomers: 'Total Customers',
      vip: 'VIP',
      regular: 'Regular',
      inactive: 'Inactive',
      customersTitle: 'Customers',
      customersDesc: 'View and manage your customer base',
      promosTitle: 'Promo Codes',
      promosDesc: 'Create and manage discount offers',
      loyaltyTitle: 'Loyalty Points',
      loyaltyDesc: 'Reward your best customers',
      topCustomers: 'Top Customers',
      viewAll: 'View all',
      ordersSuffix: 'orders',
    },
    promosPage: {
      breadcrumb: 'Promo Codes',
      title: 'Promo Codes',
      newCode: '+ New Code',
      createTitle: 'Create a new promo code',
      code: 'Code *',
      discountType: 'Discount type *',
      value: 'Value',
      minOrder: 'Minimum order (SDG)',
      minOrderOptional: 'optional',
      usageLimit: 'Usage limit',
      unlimited: 'unlimited',
      expiresAt: 'Expiry date',
      create: 'Create code',
      creating: 'Creating...',
      empty: 'No promo codes',
      emptySubtitle: 'Create promo codes to attract customers and drive orders',
      expired: 'Expired',
      active: 'Active',
      stopped: 'Stopped',
      freeDeliveryLabel: 'Free delivery',
      usage: 'Usage',
      minLabel: 'Min',
      expires: 'Expires',
      stop: 'Stop',
      activate: 'Activate',
      delete: 'Delete',
      confirmDelete: 'Delete code "{code}"?',
      promoTypes: {
        PERCENTAGE: 'Percentage discount',
        FIXED_AMOUNT: 'Fixed amount discount',
        FREE_DELIVERY: 'Free delivery',
      },
    },
  },
  ar: {
    common: {
      signIn: 'تسجيل الدخول',
      signingIn: 'جاري تسجيل الدخول...',
      email: 'البريد الإلكتروني',
      emailOrPhone: 'البريد الإلكتروني أو رقم الهاتف',
      phone: 'رقم الهاتف',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      continue: 'متابعة',
      cancel: 'إلغاء',
      or: 'أو',
      somethingWrong: 'حدث خطأ ما. حاول مرة أخرى.',
      loading: 'جاري التحميل...',
    },
    login: {
      welcomeBack: 'أهلاً بعودتك',
      subtitle: 'سجّل دخولك لحساب وصلك',
      forgotPassword: 'نسيت كلمة المرور؟',
      invalidCredentials: 'البريد/رقم الهاتف أو كلمة المرور غير صحيحة',
      noAccount: 'ليس لديك حساب؟',
      createMerchantAccount: 'إنشاء حساب تاجر',
      areYouDistributor: 'هل أنت موزّع؟',
      registerHere: 'سجّل من هنا',
    },
    register: {
      title: 'أنشئ متجرك',
      subtitle: 'ابدأ البيع أونلاين خلال دقائق مع وصلك',
      businessType: 'نوع النشاط',
      businessName: 'اسم النشاط التجاري',
      businessNamePlaceholder: 'اسم متجرك',
      yourName: 'اسمك',
      fullNamePlaceholder: 'الاسم الكامل',
      phonePlaceholder: '+249 912 345 678',
      passwordsNoMatch: 'كلمتا المرور غير متطابقتين',
      creatingStore: 'جاري إنشاء متجرك...',
      createAccount: 'إنشاء حساب تاجر',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
      types: {
        RESTAURANT: '🍽️ مطعم',
        CAFE: '☕ كافيه',
        GROCERY: '🛒 بقالة',
        PHARMACY: '💊 صيدلية',
        RETAIL: '🏪 متجر تجزئة',
        OTHER: '📦 أخرى',
      },
    },
    registerDistributor: {
      title: 'تسجيل موزّع جديد',
      subtitle: 'أنشئ حساب الموزّع الخاص بك برقم هاتفك',
      distributorName: 'اسم الموزّع / الشركة',
      whatsappPhone: 'رقم الهاتف (واتساب)',
      creatingAccount: 'جاري إنشاء الحساب...',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
    },
    otp: {
      title: 'أكّد رقم هاتفك',
      subtitlePrefix: 'أرسلنا كودًا من 6 أرقام عبر واتساب إلى',
      verificationCode: 'رمز التحقق',
      confirm: 'تأكيد',
      verifying: 'جاري التحقق...',
      resend: 'إعادة إرسال الرمز',
    },
    completeRegistration: {
      title: 'أكمل إعداد متجرك',
      businessType: 'نوع النشاط',
      invalidLink: 'رابط التسجيل غير صالح أو مستخدَم من قبل',
    },
    forgotPassword: {
      title: 'نسيت كلمة المرور؟',
      subtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين',
      sendLink: 'إرسال رابط إعادة التعيين',
      sending: 'جاري الإرسال...',
      sentPrefix: 'إذا كان يوجد حساب مرتبط بـ',
      sentSuffix: 'فقد تم إرسال رابط إعادة التعيين.',
      backToSignIn: 'العودة لتسجيل الدخول',
      remembered: 'تذكّرت كلمة المرور؟',
    },
    resetPassword: {
      title: 'إعادة تعيين كلمة المرور',
      subtitle: 'اختر كلمة مرور جديدة لحسابك',
      newPassword: 'كلمة المرور الجديدة',
      confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
      updatePassword: 'تحديث كلمة المرور',
      updating: 'جاري التحديث...',
      updated: 'تم تحديث كلمة المرور. جاري التوجيه لتسجيل الدخول...',
      missingToken: 'رابط إعادة التعيين هذا ناقص الرمز. يرجى طلب رابط جديد.',
      backToSignIn: 'العودة لتسجيل الدخول',
    },
    topbar: {
      searchPlaceholder: 'بحث في الطلبات والمنتجات...',
      notifications: 'الإشعارات',
      logout: 'تسجيل الخروج',
      platformOwner: 'مالك المنصة',
      merchantOwner: 'مالك المتجر',
      viewStorefront: 'عرض المتجر',
    },
    navDashboard: {
      home: 'الرئيسية',
      fulfillment: 'لوحة التشغيل',
      orders: 'الطلبات',
      products: 'المنتجات',
      categories: 'الفئات',
      inventory: 'المخزون',
      storefrontSection: 'المتجر الإلكتروني',
      storefrontSettings: 'إعدادات المتجر',
      customize: 'تخصيص الهوية',
      aiGenerator: 'مولّد AI',
      inbox: 'صندوق الوارد',
      financeSection: 'المالية',
      financeDashboard: 'لوحة المالية',
      transactions: 'المعاملات المالية',
      settlements: 'التسويات',
      crmSection: 'إدارة العملاء',
      crm: 'إدارة العملاء (CRM)',
      promos: 'أكواد الخصم',
      loyalty: 'نقاط الولاء',
      operationsSection: 'عمليات',
      branches: 'الفروع',
      staff: 'الموظفون',
      delivery: 'التوصيل',
      reports: 'التقارير',
      notifications: 'الإشعارات',
      settings: 'الإعدادات',
    },
    navDistributor: {
      myDataSection: 'بياناتي',
      dashboard: 'اللوحة العامة',
      merchants: 'التجار',
      users: 'المستخدمون',
      dispatch: 'لوحة الإرسال',
      operationsSection: 'الطلبيات والتشغيل',
      orders: 'الطلبيات',
      approvals: 'الموافقات',
      drivers: 'السائقون',
      deliveryCompanies: 'شركات التوصيل',
      deliveryCompaniesList: 'قائمة الشركات',
      assignDrivers: 'تعيين مندوبين',
      financeSection: 'المالية',
      finance: 'المالية',
      financeDashboard: 'لوحة المالية',
      commissionPlans: 'خطط العمولات',
      settlements: 'التسويات',
      priceLists: 'قوائم الأسعار',
      settingsSection: 'الإعدادات',
      generalSettings: 'الإعدادات العامة',
      exportData: 'تصدير البيانات',
    },
    navAdmin: {
      generalSection: 'الإدارة العامة',
      dashboard: 'لوحة التحكم',
      entitiesSection: 'الكيانات',
      distributors: 'الموزعون',
      merchants: 'التجار',
      financeReportsSection: 'المالية والتقارير',
      finance: 'المالية',
      systemSection: 'النظام',
      users: 'المستخدمون',
      settings: 'الإعدادات',
    },
    dashboardHome: {
      title: 'لوحة التحكم',
      subtitle: 'نظرة عامة على أداء متجرك اليوم',
      todaysOrders: 'طلبات اليوم',
      todaysRevenue: 'إيرادات اليوم',
      pendingOrders: 'طلبات معلّقة',
      lowStockItems: 'منتجات منخفضة المخزون',
      recentOrders: 'أحدث الطلبات',
      recentOrdersSubtitle: 'آخر الطلبات في متجرك',
      viewAll: 'عرض الكل ←',
      noOrdersToday: 'لا توجد طلبات اليوم بعد',
      unknownCustomer: 'غير معروف',
    },
    distributorHome: {
      subtitle: 'لوحة تحكم الموزع',
      totalMerchants: 'إجمالي التجار',
      activeMerchants: 'التجار النشطون',
      inactive: 'غير نشط',
      quickActions: 'إجراءات سريعة',
      addMerchant: '+ إضافة تاجر',
      viewAllMerchants: 'عرض كل التجار',
    },
    adminHome: {
      title: 'لوحة تحكم المنصة',
      subtitle: 'نظرة شاملة على أداء منصة وصلك',
      distributors: 'الموزعون',
      active: 'نشط',
      pendingApproval: 'بانتظار الموافقة',
      merchants: 'التجار',
      thisMonth: 'هذا الشهر',
      orders: 'الطلبات',
      completed: 'مكتمل',
      totalRevenue: 'إجمالي الإيرادات',
      activeDistributor: 'موزع نشط',
      suspended: 'موقوف',
      recentDistributors: 'آخر الموزعين',
      recentMerchants: 'آخر التجار',
      recentOrders: 'آخر الطلبات',
      viewAll: 'عرض الكل ←',
      none: 'لا يوجد',
      pending: 'معلق',
      manageDistributors: 'إدارة الموزعين',
      manageMerchants: 'إدارة التجار',
      finance: 'المالية',
      platformUsers: 'مستخدمو المنصة',
      orderStatus: {
        PENDING: 'معلق',
        CONFIRMED: 'مؤكد',
        PREPARING: 'يُعد',
        READY: 'جاهز',
        OUT_FOR_DELIVERY: 'في الطريق',
        DELIVERED: 'تم التوصيل',
        CANCELLED: 'ملغي',
      },
    },
    approvals: {
      title: 'الموافقات',
      subtitle: 'التجار الذين تمت دعوتهم لكن لم يكملوا إعداد متجرهم بعد',
      empty: 'لا توجد موافقات معلّقة — كل شي تمام.',
      colMerchant: 'التاجر',
      colStoreType: 'نوع المتجر',
      colContact: 'التواصل',
      colInviteStatus: 'حالة الدعوة',
      colApplied: 'تاريخ التقديم',
      colAction: 'إجراء',
      inviteExpired: 'انتهت صلاحية رابط الدعوة',
      inviteAwaiting: 'بانتظار إكمال التاجر',
      resendInvite: 'إعادة إرسال الدعوة',
      resending: 'جاري الإرسال...',
      resendSuccess: 'تم إعادة إرسال الدعوة عبر واتساب',
      resendFailed: 'تعذّر إعادة الإرسال',
    },
    distributorSettings: {
      title: 'الإعدادات',
      subtitle: 'إدارة ملف الموزّع الخاص بك',
      profile: 'ملف الموزّع',
      slugStatusLine: 'المعرّف: {slug} · الحالة: {status} · العمولة: {rate}%',
      name: 'اسم الموزّع / الشركة',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      saved: 'تم الحفظ',
    },
    exportData: {
      title: 'تصدير البيانات',
      subtitle: 'نزّل بياناتك كملفات CSV',
      merchants: 'التجار',
      merchantsDesc: 'كل تاجر تحت حسابك — الاسم، التواصل، الحالة',
      drivers: 'السائقون',
      driversDesc: 'سائقوك — التواصل، المركبة، عدد التوصيلات',
      orders: 'الطلبات',
      ordersDesc: 'أحدث الطلبات عبر كل تجارك (آخر 5000)',
      download: 'تنزيل CSV',
    },
    crud: {
      cancel: 'إلغاء',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      create: 'إنشاء',
      edit: 'تعديل',
      delete: 'حذف',
      name: 'الاسم',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      notes: 'ملاحظات',
      status: 'الحالة',
      active: 'نشط',
      inactive: 'غير نشط',
    },
    branchesPage: {
      title: 'الفروع',
      subtitle: 'إدارة فروع ومواقع متجرك',
      addBranch: '+ إضافة فرع',
      editBranch: 'تعديل الفرع',
      newBranch: 'فرع جديد',
      empty: 'لا توجد فروع بعد',
      emptySubtitle: 'أضف أول فرع/موقع لك',
      main: 'رئيسي',
      setAsMain: 'تعيين كرئيسي',
      cannotDeleteMain: 'لا يمكن حذف الفرع الرئيسي',
      confirmDelete: 'حذف "{name}"؟',
    },
    customersPage: {
      title: 'العملاء',
      subtitle: 'إدارة دليل عملائك',
      searchPlaceholder: 'ابحث بالاسم أو الهاتف أو البريد الإلكتروني',
      addCustomer: '+ إضافة عميل',
      editCustomer: 'تعديل العميل',
      newCustomer: 'عميل جديد',
      empty: 'لا يوجد عملاء بعد',
      emptySubtitle: 'يُضاف العملاء تلقائياً أيضاً عند تقديم طلب',
      colName: 'الاسم',
      colContact: 'الهاتف / البريد',
      colSegment: 'الفئة',
      colOrders: 'الطلبات',
      colTotalSpent: 'إجمالي الإنفاق',
      segments: { NEW: 'جديد', REGULAR: 'منتظم', VIP: 'مميز', INACTIVE: 'غير نشط', BLOCKED: 'محظور' },
    },
    staffPage: {
      title: 'الموظفون',
      subtitle: 'إدارة فريقك وصلاحياتهم',
      inviteStaff: '+ دعوة موظف',
      inviteTitle: 'دعوة عضو فريق جديد',
      sendInvite: 'إرسال الدعوة',
      sending: 'جاري الإرسال...',
      invitedMessage: 'تمت دعوة {email} — حدّث الصفحة لرؤيته بعد القبول',
      empty: 'لا يوجد أعضاء فريق بعد',
      colName: 'الاسم',
      colContact: 'البريد / الهاتف',
      colRole: 'الدور',
      colStatus: 'الحالة',
      you: '(أنت)',
      owner: 'مالك',
      removed: 'مُزال',
      remove: 'إزالة',
      confirmRemove: 'إزالة صلاحية دخول هذا الموظف؟',
      roles: {
        MERCHANT_ADMIN: 'مدير',
        BRANCH_MANAGER: 'مدير فرع',
        CASHIER: 'كاشير',
        INVENTORY_MANAGER: 'مدير مخزون',
        DELIVERY_STAFF: 'موظف توصيل',
        CUSTOMER_SERVICE: 'خدمة عملاء',
        FINANCE_AGENT: 'موظف مالية',
      },
    },
    categoriesPage: {
      title: 'التصنيفات',
      subtitle: 'نظّم منتجاتك في تصنيفات',
      addCategory: '+ إضافة تصنيف',
      editCategory: 'تعديل التصنيف',
      newCategory: 'تصنيف جديد',
      categoryName: 'اسم التصنيف *',
      categoryNamePlaceholder: 'مثال: وجبات رئيسية',
      create: 'إنشاء',
      productsCount: '{count} منتج',
      empty: 'لا توجد تصنيفات بعد',
      emptySubtitle: 'أضف أول تصنيف لتنظيم منتجاتك',
      confirmDelete: 'حذف تصنيف "{name}"؟',
    },
    inventoryPage: {
      title: 'المخزون',
      subtitle: 'تابع كميات المنتجات وتنبيهات نفاد المخزون',
      totalTracked: 'إجمالي المنتجات المتابَعة',
      lowStock: 'مخزون منخفض',
      outOfStock: 'نافد المخزون',
      empty: 'لا توجد منتجات متتبَّعة في المخزون بعد',
      emptySubtitle: 'المخزون يُنشأ تلقائيًا عند إضافة منتج جديد من صفحة المنتجات',
      colProduct: 'المنتج',
      colAvailable: 'المتوفر',
      colReserved: 'محجوز',
      colThreshold: 'الحد الأدنى',
      colStatus: 'الحالة',
      colAction: 'إجراء',
      adjust: 'تعديل',
      quantityLabel: 'الكمية (+ إضافة / - خصم)',
      quantityPlaceholder: 'مثال: 10 أو -5',
      reasonLabel: 'السبب',
      reasonPlaceholder: 'مثال: توريد جديد، تلف، جرد',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      invalidQuantity: 'أدخل كمية صحيحة (موجبة للإضافة، سالبة للخصم)',
      reasonRequired: 'السبب مطلوب',
      statusOk: 'متوفر',
      statusLow: 'منخفض',
      statusOut: 'نافد',
    },
    deliveryPage: {
      title: 'التوصيل',
      subtitle: 'تابع التوصيلات النشطة وعيّن السائقين',
      empty: 'لا توجد توصيلات نشطة',
      emptySubtitle: 'تظهر التوصيلات هنا عندما يحتاج طلب إلى توصيل',
      colOrder: 'الطلب',
      colCustomer: 'العميل',
      colDriver: 'السائق',
      colStatus: 'الحالة',
      reassign: 'إعادة تعيين',
      assignDriver: 'تعيين سائق',
      driverNameRequired: 'اسم ورقم هاتف السائق مطلوبان',
      driverNameLabel: 'اسم السائق',
      driverPhoneLabel: 'هاتف السائق',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      statuses: {
        PENDING: 'قيد الانتظار', ASSIGNED: 'مُعيَّن', PICKED_UP: 'تم الاستلام', IN_TRANSIT: 'في الطريق', DELIVERED: 'تم التوصيل', FAILED: 'فشل',
      },
    },
    notificationsPage: {
      title: 'الإشعارات',
      subtitle: 'تابع كل جديد عن الطلبات والمخزون والنظام',
      all: 'الكل',
      unread: 'غير مقروء',
      markAllRead: 'وضع علامة مقروء على الكل',
      markRead: 'وضع علامة مقروء',
      emptyAll: 'لا توجد إشعارات بعد',
      emptyUnread: 'لا توجد إشعارات غير مقروءة',
      emptySubtitle: 'ستظهر هنا تنبيهات الطلبات والمخزون وإشعارات النظام',
      showing: 'عرض {shown} من {total} إشعار',
      types: {
        NEW_ORDER: 'طلب جديد',
        ORDER_STATUS: 'تحديث طلب',
        LOW_STOCK: 'مخزون منخفض',
        SYSTEM: 'النظام',
      },
    },
    ordersPage: {
      title: 'الطلبات',
      subtitle: 'إدارة الطلبات الواردة والنشطة',
      loadFailed: 'تعذّر تحميل الطلبات',
      empty: 'لا توجد طلبات',
      pickup: '🏪 استلام',
      delivery: '🚚 توصيل',
      viewDetails: 'عرض التفاصيل',
      unknownCustomer: 'غير معروف',
      nextStatusLabel: {
        NEW: 'قبول',
        ACCEPTED: 'بدء التحضير',
        PREPARING: 'تحديد كجاهز',
        READY: 'خرج للتوصيل',
        OUT_FOR_DELIVERY: 'تحديد كمُسلَّم',
      },
      statusLabel: {
        NEW: 'جديد', ACCEPTED: 'مقبول', PREPARING: 'قيد التحضير', READY: 'جاهز',
        OUT_FOR_DELIVERY: 'في الطريق', DELIVERED: 'تم التوصيل', CANCELLED: 'ملغي', REJECTED: 'مرفوض',
      },
    },
    productsPage: {
      title: 'المنتجات',
      subtitle: 'إدارة كتالوج منتجاتك',
      addProduct: '+ إضافة منتج',
      loadFailed: 'تعذّر تحميل المنتجات',
      empty: 'لا توجد منتجات',
      addFirst: 'أضف أول منتج ←',
      colProduct: 'المنتج',
      colPrice: 'السعر',
      colStatus: 'الحالة',
      colActions: 'إجراءات',
      sku: 'رمز المنتج',
      active: 'نشط',
      inactive: 'غير نشط',
      edit: 'تعديل',
      activate: 'تفعيل',
      deactivate: 'إيقاف',
      delete: 'حذف',
      countSuffix: 'منتج',
      totalSuffix: 'إجمالي',
    },
    crmPage: {
      title: 'إدارة العملاء',
      subtitle: 'قاعدة عملائك · الخصومات · الولاء',
      allCustomers: 'كل العملاء',
      totalCustomers: 'إجمالي العملاء',
      vip: 'VIP',
      regular: 'منتظمون',
      inactive: 'غير نشطين',
      customersTitle: 'العملاء',
      customersDesc: 'عرض وإدارة قاعدة عملائك',
      promosTitle: 'أكواد الخصم',
      promosDesc: 'إنشاء وإدارة عروض الخصم',
      loyaltyTitle: 'نقاط الولاء',
      loyaltyDesc: 'برنامج مكافأة العملاء المميزين',
      topCustomers: 'أفضل العملاء',
      viewAll: 'عرض الكل',
      ordersSuffix: 'طلب',
    },
    promosPage: {
      breadcrumb: 'أكواد الخصم',
      title: 'أكواد الخصم',
      newCode: '+ كود جديد',
      createTitle: 'إنشاء كود خصم جديد',
      code: 'الكود *',
      discountType: 'نوع الخصم *',
      value: 'القيمة',
      minOrder: 'الحد الأدنى للطلب (SDG)',
      minOrderOptional: 'اختياري',
      usageLimit: 'حد الاستخدام',
      unlimited: 'غير محدود',
      expiresAt: 'تاريخ الانتهاء',
      create: 'إنشاء الكود',
      creating: 'جاري الحفظ...',
      empty: 'لا توجد أكواد خصم',
      emptySubtitle: 'أنشئ أكواد خصم لجذب العملاء وتحفيز الطلبات',
      expired: 'منتهي',
      active: 'نشط',
      stopped: 'موقوف',
      freeDeliveryLabel: 'توصيل مجاني',
      usage: 'الاستخدام',
      minLabel: 'حد أدنى',
      expires: 'ينتهي',
      stop: 'إيقاف',
      activate: 'تفعيل',
      delete: 'حذف',
      confirmDelete: 'حذف كود "{code}"؟',
      promoTypes: {
        PERCENTAGE: 'خصم نسبة مئوية',
        FIXED_AMOUNT: 'خصم مبلغ ثابت',
        FREE_DELIVERY: 'توصيل مجاني',
      },
    },
  },
};
