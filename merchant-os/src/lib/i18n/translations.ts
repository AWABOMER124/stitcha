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
    viewAllNotifications: string;
    settings: string;
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
  crmCustomersPage: {
    breadcrumb: string;
    title: string;
    searchPlaceholder: string;
    segmentAll: string;
    colCustomer: string;
    colSegment: string;
    colOrders: string;
    colSpent: string;
    colLastOrder: string;
    colAction: string;
    view: string;
    empty: string;
    emptySubtitle: string;
    segments: {
      NEW: string;
      REGULAR: string;
      VIP: string;
      INACTIVE: string;
      BLOCKED: string;
    };
  };
  loyaltyPage: {
    breadcrumb: string;
    title: string;
    subtitle: string;
    programSettings: string;
    programSettingsDesc: string;
    pointsPerOrderLabel: string;
    pointsPerSDGLabel: string;
    redemptionThresholdLabel: string;
    redemptionValueLabel: string;
    summaryTitle: string;
    summaryLine1: string;
    summaryLine2: string;
    save: string;
    saving: string;
    saved: string;
    leaderboardTitle: string;
    unknownCustomer: string;
  };
  customerProfilePage: {
    ordersUnit: string;
    loyaltyPoints: string;
    ordersHistory: string;
    noOrders: string;
    statusDelivered: string;
    statusCancelled: string;
    statusInProgress: string;
    actions: string;
    unblock: string;
    block: string;
    confirmUnblock: string;
    confirmBlock: string;
    notes: string;
    edit: string;
    save: string;
    cancel: string;
    noNotes: string;
  };
  financeHomePage: {
    title: string;
    subtitle: string;
    totalRevenue: string;
    completedOrdersSuffix: string;
    monthRevenue: string;
    ordersSuffix: string;
    estimatedCommission: string;
    basedOnPlan: string;
    estimatedNet: string;
    afterCommission: string;
    commissionPlanTitle: string;
    rateOrAmount: string;
    minFeeLabel: string;
    noPlanTitle: string;
    noPlanDesc: string;
    commissionTypes: {
      PERCENTAGE: string;
      FLAT_FEE: string;
      HYBRID: string;
      SUBSCRIPTION: string;
    };
    commissionDescPercentage: string;
    commissionDescFlatFee: string;
    commissionDescHybrid: string;
    commissionDescSubscription: string;
    settlementsTitle: string;
    viewAll: string;
    pendingSettlement: string;
    noPreviousSettlement: string;
    viewSettlementsHistory: string;
    transactionsCardTitle: string;
    transactionsCardDesc: string;
    settlementsCardTitle: string;
    settlementsCardDesc: string;
    reportsCardTitle: string;
    reportsCardDesc: string;
  };
  financeSettlementsPage: {
    breadcrumb: string;
    title: string;
    subtitlePrefix: string;
    subtitleSuffix: string;
    all: string;
    empty: string;
    emptySubtitle: string;
    completedOrdersSuffix: string;
    netDue: string;
    totalSales: string;
    commissionCharged: string;
    otherFees: string;
    paidOn: string;
    pageOf: string;
    prev: string;
    next: string;
    statuses: {
      PENDING: string;
      PROCESSING: string;
      COMPLETED: string;
      FAILED: string;
    };
  };
  financeTransactionsPage: {
    breadcrumb: string;
    title: string;
    subtitlePrefix: string;
    subtitleSuffix: string;
    all: string;
    empty: string;
    emptySubtitle: string;
    colType: string;
    colDescription: string;
    colReference: string;
    colAmount: string;
    colDate: string;
    pageOf: string;
    prev: string;
    next: string;
    types: {
      ORDER_PAYMENT: string;
      COMMISSION: string;
      REFUND: string;
      SUBSCRIPTION_FEE: string;
      DELIVERY_FEE: string;
      ADJUSTMENT: string;
      PAYOUT: string;
    };
  };
  fulfillmentPage: {
    title: string;
    subtitle: string;
    allOrders: string;
    statToday: string;
    statActive: string;
    statDelivered: string;
    statRevenue: string;
    statAvgPrep: string;
    avgPrepSuffix: string;
    live: string;
    activeOrdersSuffix: string;
    lastUpdated: string;
    refresh: string;
    dismiss: string;
    emptyColumn: string;
    details: string;
    delayed: string;
    unknownProduct: string;
    unknownCustomer: string;
    otherItemsSuffix: string;
    itemsSuffix: string;
    cancel: string;
    reject: string;
    minuteAbbr: string;
    hourAbbr: string;
    columns: {
      NEW: string;
      ACCEPTED: string;
      PREPARING: string;
      READY: string;
      OUT_FOR_DELIVERY: string;
      DELIVERED: string;
    };
    nextStatusLabel: {
      NEW: string;
      ACCEPTED: string;
      PREPARING: string;
      READY: string;
      OUT_FOR_DELIVERY: string;
    };
  };
  inboxPage: {
    title: string;
    filterAll: string;
    filterOpen: string;
    filterClosed: string;
    emptyConversations: string;
    unknownCustomer: string;
    customer: string;
    closeConversation: string;
    you: string;
    suggestReplyTitle: string;
    suggestReplyButton: string;
    suggestReplyLoading: string;
    suggestFailed: string;
    savedButFailedPrefix: string;
    inputPlaceholder: string;
    send: string;
    conversationClosed: string;
    selectConversation: string;
    statuses: {
      OPEN: string;
      PENDING: string;
      CLOSED: string;
    };
  };
  settingsPage: {
    title: string;
    subtitle: string;
    saved: string;
    saving: string;
    storeProfileTitle: string;
    storeProfileDesc: string;
    businessName: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    saveProfile: string;
    storefrontTitle: string;
    storefrontDesc: string;
    isOpenLabel: string;
    deliveryEnabledLabel: string;
    pickupEnabledLabel: string;
    minOrderLabel: string;
    welcomeMessageLabel: string;
    welcomePlaceholder: string;
    saveStorefront: string;
    whatsappTitle: string;
    whatsappDesc: string;
    connected: string;
    disconnected: string;
    webhookUrlLabel: string;
    phoneNumberIdLabel: string;
    phoneNumberIdPlaceholder: string;
    wabaIdLabel: string;
    displayPhoneLabel: string;
    displayPhonePlaceholder: string;
    accessTokenLabel: string;
    accessTokenCurrentPrefix: string;
    accessTokenPlaceholderConfigured: string;
    accessTokenPlaceholderNew: string;
    updateConnection: string;
    connectWhatsapp: string;
    disconnect: string;
    whatsappNote: string;
  };
  reportsPage: {
    title: string;
    subtitle: string;
    ranges: {
      today: string;
      yesterday: string;
      week: string;
      month: string;
      quarter: string;
    };
    kpiTotalOrders: string;
    kpiRevenue: string;
    kpiAvgOrder: string;
    kpiCancellationRate: string;
    kpiNewCustomers: string;
    changeSuffix: string;
    revenueTrendTitle: string;
    revenueTrendSubtitle: string;
    totalSuffix: string;
    statusDistTitle: string;
    statusDistSubtitlePrefix: string;
    statusDistSubtitleSuffix: string;
    noData: string;
    peakHoursTitle: string;
    peakBadgePrefix: string;
    peakHoursSubtitle: string;
    topProductsTitle: string;
    topProductsSubtitle: string;
    colRank: string;
    colProduct: string;
    colQuantity: string;
    colRevenue: string;
    financialSummaryTitle: string;
    grossSales: string;
    deliveryFees: string;
    discounts: string;
    netRevenue: string;
    legendNet: string;
    legendDelivery: string;
    legendDiscounts: string;
    topCustomersTitle: string;
    viewAll: string;
    ordersSuffix: string;
    branchPerformanceTitle: string;
    noBranches: string;
    cancellationsSuffix: string;
    tooltipRevenue: string;
    tooltipOrders: string;
    tooltipQuantity: string;
  };
  storefrontHomePage: {
    title: string;
    subtitle: string;
    viewStore: string;
    statStoreStatus: string;
    statOpen: string;
    statClosed: string;
    statDelivery: string;
    statPickup: string;
    statMinOrder: string;
    statEnabled: string;
    statDisabled: string;
    storeUrlLabel: string;
    openLink: string;
    linkCustomizeTitle: string;
    linkCustomizeDesc: string;
    linkAiTitle: string;
    linkAiDesc: string;
    linkProductsTitle: string;
    linkProductsDesc: string;
    linkInboxTitle: string;
    linkInboxDesc: string;
  };
  storefrontAiPage: {
    backToStore: string;
    title: string;
    howItWorksTitle: string;
    howItWorksDesc: string;
    promptLabel: string;
    promptPlaceholder: string;
    examplesLabel: string;
    examples: string[];
    generating: string;
    generateButton: string;
    genericError: string;
    connectionError: string;
    descriptionLabel: string;
    welcomeMessageLabel: string;
    categoriesLabel: string;
    primaryColorLabel: string;
    applyingButton: string;
    applyButton: string;
    appliedMessage: string;
  };
  storefrontCustomizePage: {
    backToStore: string;
    title: string;
    previewLabel: string;
    colorsTitle: string;
    primaryColorLabel: string;
    secondaryColorLabel: string;
    imagesTitle: string;
    logoUrlLabel: string;
    bannerUrlLabel: string;
    welcomeMessageLabel: string;
    welcomePlaceholder: string;
    orderSettingsTitle: string;
    isOpenToggle: string;
    deliveryToggle: string;
    pickupToggle: string;
    minOrderLabel: string;
    socialTitle: string;
    whatsappLabel: string;
    instagramLabel: string;
    facebookLabel: string;
    saved: string;
    saving: string;
    saveButton: string;
    previewButton: string;
    genericError: string;
  };
  adminDistributorsPage: {
    title: string;
    subtitleSuffix: string;
    searchPlaceholder: string;
    search: string;
    newDistributor: string;
    createTitle: string;
    nameLabel: string;
    slugLabel: string;
    emailLabel: string;
    phoneLabel: string;
    commissionRateLabel: string;
    creating: string;
    create: string;
    cancel: string;
    empty: string;
    colDistributor: string;
    colStatus: string;
    colMerchants: string;
    colDrivers: string;
    colCommission: string;
    colJoined: string;
    colAction: string;
    view: string;
    approve: string;
    suspend: string;
    activate: string;
    pageOf: string;
    prev: string;
    next: string;
    distributorsSuffix: string;
    statuses: {
      ACTIVE: string;
      PENDING: string;
      SUSPENDED: string;
    };
  };
  adminDistributorDetailPage: {
    breadcrumbAdmin: string;
    breadcrumbDistributors: string;
    merchantsUnit: string;
    driversUnit: string;
    commissionRateLabel: string;
    usersTitle: string;
    noUsers: string;
    owner: string;
    admin: string;
    merchantsTitlePrefix: string;
    noMerchants: string;
    colMerchant: string;
    colStatus: string;
    colOrders: string;
    colJoined: string;
    activateDistributor: string;
    suspendDistributor: string;
    reactivateDistributor: string;
    merchantStatuses: {
      ACTIVE: string;
      PENDING: string;
      SUSPENDED: string;
      CLOSED: string;
    };
  };
  adminFinancePage: {
    title: string;
    subtitle: string;
    kpiTotalRevenue: string;
    kpiMonthRevenue: string;
    kpiTotalCommission: string;
    kpiTotalPaidOut: string;
    kpiTotalSettlements: string;
    kpiPendingSettlements: string;
    distributorsSummaryTitle: string;
    distributorsSummarySubtitle: string;
    noDistributors: string;
    colDistributor: string;
    colStatus: string;
    colMerchants: string;
    colCommissionRate: string;
  };
  adminMerchantsPage: {
    title: string;
    subtitleSuffix: string;
    filterAll: string;
    empty: string;
    colMerchant: string;
    colBusinessType: string;
    colDistributor: string;
    colStatus: string;
    colOrders: string;
    colProducts: string;
    colJoined: string;
    direct: string;
    pageOf: string;
    prev: string;
    next: string;
    businessTypes: {
      RESTAURANT: string;
      GROCERY: string;
      PHARMACY: string;
      ELECTRONICS: string;
      FASHION: string;
      FLOWERS: string;
      BAKERY: string;
      OTHER: string;
    };
  };
  adminSettingsPage: {
    title: string;
    subtitle: string;
    platformName: string;
    defaultCurrency: string;
    timezone: string;
    systemVersion: string;
    environment: string;
    advancedNote: string;
  };
  adminUsersPage: {
    title: string;
    subtitlePrefix: string;
    empty: string;
    colUser: string;
    colEmail: string;
    colRole: string;
    colVerification: string;
    colCreated: string;
    verified: string;
    unverified: string;
    addUserNote: string;
  };
  driverShared: {
    statuses: {
      OFFLINE: string;
      ONLINE: string;
      BUSY: string;
      ON_BREAK: string;
    };
    vehicles: {
      MOTORCYCLE: string;
      CAR: string;
      BICYCLE: string;
      VAN: string;
    };
  };
  deliveryCompaniesPage: {
    title: string;
    subtitle: string;
    assignDrivers: string;
    newCompany: string;
    cancel: string;
    createTitle: string;
    editTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    contactNameLabel: string;
    phoneLabel: string;
    saving: string;
    save: string;
    create: string;
    empty: string;
    emptySubtitle: string;
    active: string;
    suspended: string;
    driversSuffix: string;
    linkedMerchantsSuffix: string;
    edit: string;
    delete: string;
    confirmDelete: string;
  };
  deliveryCompanyDriversPage: {
    breadcrumb: string;
    title: string;
    subtitle: string;
    colDriver: string;
    colPhone: string;
    colCompany: string;
    internalOption: string;
    empty: string;
  };
  dispatchPage: {
    title: string;
    subtitle: string;
    needsDriverTitle: string;
    availableDriversTitle: string;
    noAvailableDrivers: string;
    deliveriesSuffix: string;
    noPendingOrders: string;
    noPendingOrdersSubtitle: string;
    chooseDriver: string;
    assign: string;
    noDriversAvailable: string;
    minAbbr: string;
  };
  driversPage: {
    title: string;
    subtitle: string;
    addDriver: string;
    statTotal: string;
    statOnline: string;
    statBusy: string;
    statOffline: string;
    searchPlaceholder: string;
    empty: string;
    emptySubtitle: string;
    colDriver: string;
    colVehicle: string;
    colStatus: string;
    colRating: string;
    colDeliveries: string;
    colLastActive: string;
    colActions: string;
    unknown: string;
    view: string;
    deactivate: string;
    activate: string;
    delete: string;
    confirmDelete: string;
  };
  driverProfilePage: {
    breadcrumb: string;
    totalDeliveries: string;
    rating: string;
    vehicleLabel: string;
    plateLabel: string;
    nationalIdLabel: string;
    statusLabel: string;
    active: string;
    suspended: string;
    verificationLabel: string;
    verified: string;
    unverified: string;
    earningsTitle: string;
    earningsDesc: string;
    quickActionsTitle: string;
    unverify: string;
    verify: string;
    deactivate: string;
    activate: string;
    recentDeliveriesTitle: string;
    noDeliveries: string;
    orderPrefix: string;
    delivered: string;
    inProgress: string;
    recentEarningsTitle: string;
  };
  driverEarningsPage: {
    breadcrumb: string;
    titlePrefix: string;
    subtitlePrefix: string;
    transactionsSuffix: string;
    grandTotal: string;
    empty: string;
    emptySubtitle: string;
    colType: string;
    colDescription: string;
    colOrder: string;
    colAmount: string;
    colDate: string;
    pageOf: string;
    prev: string;
    next: string;
    types: {
      DELIVERY: string;
      BONUS: string;
      DEDUCTION: string;
      TIP: string;
      PAYOUT: string;
    };
  };
  newDriverPage: {
    breadcrumb: string;
    title: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    phoneLabel: string;
    nationalIdLabel: string;
    nationalIdPlaceholder: string;
    vehicleTypeLabel: string;
    platePlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    saving: string;
    submit: string;
    cancel: string;
  };
  distributorFinancePage: {
    title: string;
    subtitle: string;
    settlementsLink: string;
    commissionPlansLink: string;
    sectionMerchants: string;
    statMerchants: string;
    statActiveMerchants: string;
    statPendingSettlements: string;
    sectionFinance: string;
    statTotalRevenue: string;
    statTotalFees: string;
    statTotalCommissions: string;
    merchantAccountTitle: string;
    merchantAccountSubtitle: string;
    createSettlementLink: string;
    noMerchants: string;
    colMerchant: string;
    colCommissionPlan: string;
    colOrders: string;
    colTotalSales: string;
    colCommission: string;
    colMerchantNet: string;
    colStatus: string;
    colAction: string;
    noPlan: string;
    settle: string;
    quickCommissions: string;
    quickCommissionsDesc: string;
    quickSettlements: string;
    quickSettlementsDesc: string;
    quickPriceLists: string;
    quickPriceListsDesc: string;
    commissionTypes: {
      PERCENTAGE: string;
      FLAT_FEE: string;
      HYBRID: string;
      SUBSCRIPTION: string;
    };
    statuses: {
      ACTIVE: string;
      PENDING: string;
      SUSPENDED: string;
      CLOSED: string;
    };
  };
  distributorCommissionsPage: {
    breadcrumb: string;
    title: string;
    subtitle: string;
    default: string;
    rateOrFees: string;
    minFee: string;
    linkedMerchants: string;
    active: string;
    disabled: string;
    delete: string;
    addNew: string;
    modalTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    typeLabel: string;
    rateLabelPercent: string;
    rateLabelAmount: string;
    minFeeLabel: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    setDefault: string;
    saving: string;
    save: string;
    cancel: string;
    confirmDelete: string;
    types: {
      PERCENTAGE: string;
      FLAT_FEE: string;
      HYBRID: string;
      SUBSCRIPTION: string;
    };
  };
  distributorPriceListsPage: {
    breadcrumb: string;
    title: string;
    subtitle: string;
    zonesSuffix: string;
    addZone: string;
    empty: string;
    emptySubtitle: string;
    baseFee: string;
    perKmFee: string;
    maxDistance: string;
    kmUnit: string;
    deliveryTime: string;
    active: string;
    disabled: string;
    disable: string;
    enable: string;
    delete: string;
    confirmDelete: string;
    modalTitle: string;
    zoneNameLabel: string;
    zoneNamePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    baseFeeLabel: string;
    perKmFeeLabel: string;
    maxDistanceLabel: string;
    maxDistanceOptional: string;
    deliveryTimeLabel: string;
    deliveryTimePlaceholder: string;
    saving: string;
    save: string;
    cancel: string;
  };
  distributorSettlementsPage: {
    breadcrumb: string;
    title: string;
    subtitle: string;
    totalSales: string;
    totalCommissions: string;
    totalMerchantNet: string;
    settlementsSuffix: string;
    createSettlement: string;
    empty: string;
    colMerchant: string;
    colPeriod: string;
    colOrders: string;
    colSales: string;
    colCommission: string;
    colNet: string;
    colStatus: string;
    colAction: string;
    confirmPayment: string;
    confirmMarkPaid: string;
    modalTitle: string;
    merchantLabel: string;
    chooseMerchant: string;
    fromLabel: string;
    toLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    calculating: string;
    create: string;
    cancel: string;
    statuses: {
      PENDING: string;
      PROCESSING: string;
      COMPLETED: string;
      FAILED: string;
    };
  };
  distributorMerchantsPage: {
    title: string;
    subtitle: string;
    addMerchant: string;
    empty: string;
    addFirst: string;
    colMerchant: string;
    colStoreType: string;
    colStatus: string;
    colBranches: string;
    colUsers: string;
    colOrders: string;
    colDeliveryCo: string;
    colActions: string;
    manage: string;
    none: string;
    suspend: string;
    activate: string;
    approve: string;
    reactivate: string;
    confirmSuspend: string;
    storeTypes: {
      FOOD_MENU: string;
      ONLINE_STORE: string;
      SERVICES: string;
      BOOKING: string;
      OTHER: string;
    };
    statuses: {
      ACTIVE: string;
      PENDING: string;
      SUSPENDED: string;
      CLOSED: string;
    };
  };
  distributorMerchantDetailPage: {
    breadcrumb: string;
    branchesTitle: string;
    noBranches: string;
    main: string;
    inactive: string;
    usersTitle: string;
    noUsers: string;
    owner: string;
    deliveryCompanyTitle: string;
    deliveryCompanyDesc: string;
    noneOption: string;
  };
  distributorNewMerchantPage: {
    title: string;
    subtitle: string;
    storeNameLabel: string;
    storeNamePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    cancel: string;
    sending: string;
    submit: string;
    sentTitle: string;
    sentDescPrefix: string;
    sentDescSuffix: string;
    backToMerchants: string;
    genericError: string;
  };
  distributorOrdersPage: {
    title: string;
    subtitle: string;
    tabActive: string;
    tabArchived: string;
    tabAll: string;
    searchPlaceholder: string;
    search: string;
    empty: string;
    colOrderNumber: string;
    colSender: string;
    colRecipient: string;
    colStatus: string;
    colDeliveryCompany: string;
    colAmount: string;
    ownDriversOption: string;
    statuses: {
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
  distributorUsersPage: {
    title: string;
    subtitle: string;
    inviteUser: string;
    cancel: string;
    invitedMessage: string;
    inviteTitle: string;
    emailLabel: string;
    roleLabel: string;
    isOwnerLabel: string;
    sending: string;
    sendInvite: string;
    empty: string;
    colName: string;
    colContact: string;
    colRole: string;
    colOwner: string;
    colStatus: string;
    colActions: string;
    you: string;
    yes: string;
    no: string;
    active: string;
    suspended: string;
    deactivate: string;
    activate: string;
    cannotDeactivateSelf: string;
    roles: {
      DISTRIBUTOR_OWNER: string;
      DISTRIBUTOR_ADMIN: string;
    };
  };
  orderDetailPage: {
    backToOrders: string;
    orderNumberPrefix: string;
    cancelOrder: string;
    rejectOrder: string;
    itemsTitle: string;
    unknownProduct: string;
    noteLabel: string;
    subtotal: string;
    deliveryFee: string;
    discount: string;
    tax: string;
    total: string;
    statusHistoryTitle: string;
    customerInfoTitle: string;
    deliveryPaymentTitle: string;
    deliveryMethodLabel: string;
    paymentMethodLabel: string;
    branchLabel: string;
    notesTitle: string;
    customerNotePrefix: string;
    internalNotePrefix: string;
    deliveryMethods: {
      PICKUP: string;
      MERCHANT_DELIVERY: string;
      WASLAK_DELIVERY: string;
      EXTERNAL_DELIVERY: string;
    };
    paymentMethods: {
      CASH: string;
      CARD: string;
      ONLINE: string;
      WALLET: string;
    };
  };
  statusTabsAll: string;
  productFormPage: {
    addTitle: string;
    addSubtitle: string;
    editTitle: string;
    genericError: string;
    nameLabel: string;
    namePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    categoryLabel: string;
    selectCategoryPlaceholder: string;
    priceLabel: string;
    comparePriceLabel: string;
    comparePricePlaceholder: string;
    skuLabel: string;
    skuPlaceholder: string;
    activeToggleLabel: string;
    featuredToggleLabel: string;
    cancel: string;
    saving: string;
    saveChanges: string;
    createProduct: string;
    searchPlaceholder: string;
    filterAllStatus: string;
    filterActive: string;
    filterInactive: string;
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
      viewAllNotifications: 'View all notifications',
      settings: 'Settings',
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
    crmCustomersPage: {
      breadcrumb: 'Customers',
      title: 'Customers',
      searchPlaceholder: 'Search by name or phone...',
      segmentAll: 'All',
      colCustomer: 'Customer',
      colSegment: 'Segment',
      colOrders: 'Orders',
      colSpent: 'Spent',
      colLastOrder: 'Last order',
      colAction: '',
      view: 'View',
      empty: 'No customers',
      emptySubtitle: 'Customer data will appear once you receive orders',
      segments: {
        NEW: 'New',
        REGULAR: 'Regular',
        VIP: 'VIP',
        INACTIVE: 'Inactive',
        BLOCKED: 'Blocked',
      },
    },
    loyaltyPage: {
      breadcrumb: 'Loyalty Points',
      title: 'Loyalty Program',
      subtitle: 'Reward your best customers with redeemable points',
      programSettings: 'Program Settings',
      programSettingsDesc: 'Enable and adjust point-earning rules',
      pointsPerOrderLabel: 'Points per order',
      pointsPerSDGLabel: 'Points per SDG',
      redemptionThresholdLabel: 'Redemption threshold (points)',
      redemptionValueLabel: 'Redemption value (SDG)',
      summaryTitle: 'Program summary',
      summaryLine1: 'Customer earns {a} points + {b} points/SDG per order.',
      summaryLine2: 'Reaching {c} points unlocks a {d} SDG discount.',
      save: 'Save Settings',
      saving: 'Saving...',
      saved: '✓ Saved',
      leaderboardTitle: '🏆 Top point earners',
      unknownCustomer: 'Unknown',
    },
    customerProfilePage: {
      ordersUnit: 'orders',
      loyaltyPoints: 'Loyalty points',
      ordersHistory: 'Order history',
      noOrders: 'No orders',
      statusDelivered: 'Delivered',
      statusCancelled: 'Cancelled',
      statusInProgress: 'In progress',
      actions: 'Actions',
      unblock: '✓ Unblock',
      block: '⛔ Block customer',
      confirmUnblock: 'Unblock this customer?',
      confirmBlock: 'Block this customer from ordering?',
      notes: 'Notes',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      noNotes: 'No notes',
    },
    financeHomePage: {
      title: 'Finance',
      subtitle: 'A full overview of your revenue, commissions and dues',
      totalRevenue: 'Total sales',
      completedOrdersSuffix: 'completed orders',
      monthRevenue: 'This month\'s sales',
      ordersSuffix: 'orders',
      estimatedCommission: 'Estimated commission (month)',
      basedOnPlan: 'Based on your commission plan',
      estimatedNet: 'Estimated net (month)',
      afterCommission: 'After commission deduction',
      commissionPlanTitle: 'Commission plan',
      rateOrAmount: 'Rate / amount',
      minFeeLabel: 'Minimum commission',
      noPlanTitle: 'No commission plan assigned yet',
      noPlanDesc: 'Contact your operator to assign a commission plan',
      commissionTypes: {
        PERCENTAGE: 'Percentage',
        FLAT_FEE: 'Flat fee',
        HYBRID: 'Hybrid',
        SUBSCRIPTION: 'Monthly subscription',
      },
      commissionDescPercentage: 'Calculated as {rate}% of the total value of every completed order.',
      commissionDescFlatFee: 'A flat fee of {rate} {cur} on every completed order.',
      commissionDescHybrid: 'Whichever is higher: {rate}% of sales, or {minFee} {cur} per order.',
      commissionDescSubscription: 'A fixed monthly subscription fee of {rate} {cur}.',
      settlementsTitle: 'Settlements',
      viewAll: 'View all →',
      pendingSettlement: 'pending settlement',
      noPreviousSettlement: 'No previous settlement',
      viewSettlementsHistory: 'View settlements history',
      transactionsCardTitle: 'Transaction history',
      transactionsCardDesc: 'View all financial transactions',
      settlementsCardTitle: 'Financial settlements',
      settlementsCardDesc: 'Track settlement and payment status',
      reportsCardTitle: 'Financial reports',
      reportsCardDesc: 'Detailed reports by period',
    },
    financeSettlementsPage: {
      breadcrumb: 'Settlements',
      title: 'Settlements history',
      subtitlePrefix: 'Payments received from the operator —',
      subtitleSuffix: 'settlements',
      all: 'All',
      empty: 'No settlements',
      emptySubtitle: 'Settlements created by the operator for your store will appear here',
      completedOrdersSuffix: 'completed orders',
      netDue: 'Net due',
      totalSales: 'Total sales',
      commissionCharged: 'Commission charged',
      otherFees: 'Other fees',
      paidOn: 'Paid on',
      pageOf: 'Page {page} of {total}',
      prev: 'Previous',
      next: 'Next',
      statuses: {
        PENDING: 'Pending',
        PROCESSING: 'Processing',
        COMPLETED: 'Completed',
        FAILED: 'Failed',
      },
    },
    financeTransactionsPage: {
      breadcrumb: 'Transaction history',
      title: 'Transaction history',
      subtitlePrefix: 'All financial activity for your store —',
      subtitleSuffix: 'transactions',
      all: 'All',
      empty: 'No transactions',
      emptySubtitle: 'Your financial transactions will appear here once orders are fulfilled',
      colType: 'Type',
      colDescription: 'Description',
      colReference: 'Reference',
      colAmount: 'Amount',
      colDate: 'Date',
      pageOf: 'Page {page} of {total}',
      prev: 'Previous',
      next: 'Next',
      types: {
        ORDER_PAYMENT: 'Order payment',
        COMMISSION: 'Commission',
        REFUND: 'Refund',
        SUBSCRIPTION_FEE: 'Subscription fee',
        DELIVERY_FEE: 'Delivery fee',
        ADJUSTMENT: 'Adjustment',
        PAYOUT: 'Payout',
      },
    },
    fulfillmentPage: {
      title: 'Fulfillment board',
      subtitle: 'Track active orders live — refreshes every 30s',
      allOrders: 'All orders →',
      statToday: "Today's orders",
      statActive: 'Active orders',
      statDelivered: 'Delivered',
      statRevenue: "Today's revenue",
      statAvgPrep: 'Avg. prep time',
      avgPrepSuffix: 'For completed orders',
      live: 'Live',
      activeOrdersSuffix: 'active orders',
      lastUpdated: 'Last updated:',
      refresh: '↻ Refresh',
      dismiss: 'Dismiss',
      emptyColumn: 'No orders',
      details: 'Details',
      delayed: '⚠ Delayed',
      unknownProduct: 'Item',
      unknownCustomer: '—',
      otherItemsSuffix: 'more items',
      itemsSuffix: 'items',
      cancel: 'Cancel',
      reject: 'Reject',
      minuteAbbr: 'm',
      hourAbbr: 'h',
      columns: {
        NEW: 'New',
        ACCEPTED: 'Accepted',
        PREPARING: 'Preparing',
        READY: 'Ready',
        OUT_FOR_DELIVERY: 'Out for delivery',
        DELIVERED: 'Delivered',
      },
      nextStatusLabel: {
        NEW: 'Accept order',
        ACCEPTED: 'Start preparing',
        PREPARING: 'Mark ready',
        READY: 'Out for delivery',
        OUT_FOR_DELIVERY: 'Mark delivered',
      },
    },
    inboxPage: {
      title: 'Inbox',
      filterAll: 'All',
      filterOpen: 'Open',
      filterClosed: 'Closed',
      emptyConversations: 'No conversations',
      unknownCustomer: 'Unknown customer',
      customer: 'Customer',
      closeConversation: 'Close conversation',
      you: 'You',
      suggestReplyTitle: 'Suggest an AI reply',
      suggestReplyButton: '✨ Suggest reply',
      suggestReplyLoading: '...',
      suggestFailed: 'Failed to generate a suggestion',
      savedButFailedPrefix: 'Saved but failed to send via WhatsApp:',
      inputPlaceholder: 'Write your reply...',
      send: 'Send',
      conversationClosed: 'Conversation closed',
      selectConversation: 'Select a conversation to start',
      statuses: {
        OPEN: 'Open',
        PENDING: 'Pending',
        CLOSED: 'Closed',
      },
    },
    settingsPage: {
      title: 'Settings',
      subtitle: 'Configure your store and storefront',
      saved: 'Saved',
      saving: 'Saving...',
      storeProfileTitle: 'Store Profile',
      storeProfileDesc: 'Business name and contact info',
      businessName: 'Business name',
      description: 'Description',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      saveProfile: 'Save profile',
      storefrontTitle: 'Storefront',
      storefrontDesc: 'Ordering options customers see',
      isOpenLabel: 'Store is open for orders',
      deliveryEnabledLabel: 'Delivery enabled',
      pickupEnabledLabel: 'Pickup enabled',
      minOrderLabel: 'Minimum order amount (SDG)',
      welcomeMessageLabel: 'Welcome message',
      welcomePlaceholder: 'Shown at the top of your storefront',
      saveStorefront: 'Save storefront',
      whatsappTitle: 'WhatsApp channel',
      whatsappDesc: 'Connect your own WhatsApp Business number to receive and reply to customers in the Inbox',
      connected: 'Connected',
      disconnected: 'Disabled',
      webhookUrlLabel: "Webhook URL (set this in your Meta App's WhatsApp configuration)",
      phoneNumberIdLabel: 'Phone Number ID',
      phoneNumberIdPlaceholder: 'from Meta Business Suite',
      wabaIdLabel: 'WhatsApp Business Account ID (optional)',
      displayPhoneLabel: 'Display phone number (optional)',
      displayPhonePlaceholder: '+2499xxxxxxxx',
      accessTokenLabel: 'Access token',
      accessTokenCurrentPrefix: 'current:',
      accessTokenPlaceholderConfigured: 'Leave blank to keep current token',
      accessTokenPlaceholderNew: 'Meta system-user access token',
      updateConnection: 'Update connection',
      connectWhatsapp: 'Connect WhatsApp',
      disconnect: 'Disconnect',
      whatsappNote: "Note: WhatsApp only allows free-form replies within 24 hours of the customer's last message — outside that window, messages require a pre-approved template.",
    },
    reportsPage: {
      title: 'Reports & Analytics',
      subtitle: 'A full analysis of sales and operations',
      ranges: {
        today: 'Today',
        yesterday: 'Yesterday',
        week: '7 days',
        month: '30 days',
        quarter: '3 months',
      },
      kpiTotalOrders: 'Total orders',
      kpiRevenue: 'Revenue',
      kpiAvgOrder: 'Avg. order',
      kpiCancellationRate: 'Cancellation rate',
      kpiNewCustomers: 'New customers',
      changeSuffix: 'vs. previous period',
      revenueTrendTitle: 'Revenue trend',
      revenueTrendSubtitle: 'Bars = revenue (SDG) · Line = order count',
      totalSuffix: 'SDG total',
      statusDistTitle: 'Order status distribution',
      statusDistSubtitlePrefix: 'Total',
      statusDistSubtitleSuffix: 'orders',
      noData: 'No data',
      peakHoursTitle: 'Peak hours',
      peakBadgePrefix: 'Peak',
      peakHoursSubtitle: 'Order distribution throughout the day',
      topProductsTitle: 'Top-selling products',
      topProductsSubtitle: 'Based on quantity sold from completed orders',
      colRank: '#',
      colProduct: 'Product',
      colQuantity: 'Quantity',
      colRevenue: 'Revenue',
      financialSummaryTitle: 'Financial summary',
      grossSales: 'Total sales',
      deliveryFees: 'Delivery fees',
      discounts: 'Discounts',
      netRevenue: 'Net revenue',
      legendNet: 'Net',
      legendDelivery: 'Delivery',
      legendDiscounts: 'Discounts',
      topCustomersTitle: 'Top customers',
      viewAll: 'View all',
      ordersSuffix: 'orders',
      branchPerformanceTitle: 'Branch performance',
      noBranches: 'No branches',
      cancellationsSuffix: 'cancellations',
      tooltipRevenue: 'Revenue',
      tooltipOrders: 'Orders',
      tooltipQuantity: 'Quantity',
    },
    storefrontHomePage: {
      title: 'Online Store',
      subtitle: "Manage your storefront's customer-facing experience",
      viewStore: '🔗 View store',
      statStoreStatus: 'Store status',
      statOpen: 'Open',
      statClosed: 'Closed',
      statDelivery: 'Delivery',
      statPickup: 'Pickup',
      statMinOrder: 'Minimum order',
      statEnabled: 'Enabled',
      statDisabled: 'Disabled',
      storeUrlLabel: 'Your store link',
      openLink: 'Open ↗',
      linkCustomizeTitle: 'Customize branding',
      linkCustomizeDesc: 'Colors, logo, banner, business hours',
      linkAiTitle: 'AI Generator',
      linkAiDesc: 'Generate your store content with AI',
      linkProductsTitle: 'Manage products',
      linkProductsDesc: 'Add and edit your products and categories',
      linkInboxTitle: 'Inbox',
      linkInboxDesc: 'Customer messages and communication',
    },
    storefrontAiPage: {
      backToStore: '← Store',
      title: 'AI Store Generator',
      howItWorksTitle: '🤖 How does it work?',
      howItWorksDesc: 'Describe your business and AI will automatically generate your store name, description, categories, products, and matching colors.',
      promptLabel: 'Describe your business',
      promptPlaceholder: 'Example: I have a burger restaurant in Khartoum, we serve fresh beef burgers with drinks and sides...',
      examplesLabel: 'Quick examples:',
      examples: [
        'I have a shawarma restaurant in Khartoum, serving Sudanese and Levantine meals',
        'A modern women\'s clothing store in Omdurman, fashion and modest wear',
        'A men\'s barbershop in Bahri, haircuts and hair care',
        'A home bakery, cakes, basbousa and traditional sweets',
      ],
      generating: 'Generating...',
      generateButton: '✨ Generate store',
      genericError: 'Generation failed',
      connectionError: 'Connection error',
      descriptionLabel: 'Description',
      welcomeMessageLabel: 'Welcome message',
      categoriesLabel: 'Suggested categories and products',
      primaryColorLabel: 'Primary color',
      applyingButton: 'Applying...',
      applyButton: '🚀 Apply to store',
      appliedMessage: '✓ Content applied to your store!',
    },
    storefrontCustomizePage: {
      backToStore: '← Store',
      title: 'Customize branding',
      previewLabel: 'Brand preview',
      colorsTitle: '🎨 Colors',
      primaryColorLabel: 'Primary color',
      secondaryColorLabel: 'Secondary color',
      imagesTitle: '🖼️ Images & content',
      logoUrlLabel: 'Logo URL',
      bannerUrlLabel: 'Banner image URL',
      welcomeMessageLabel: 'Welcome message',
      welcomePlaceholder: 'Welcome to our store...',
      orderSettingsTitle: '⚙️ Order settings',
      isOpenToggle: 'Store is open now',
      deliveryToggle: 'Enable delivery',
      pickupToggle: 'Enable branch pickup',
      minOrderLabel: 'Minimum order amount (SDG)',
      socialTitle: '📱 Social media',
      whatsappLabel: 'WhatsApp number',
      instagramLabel: 'Instagram',
      facebookLabel: 'Facebook',
      saved: '✓ Saved successfully',
      saving: 'Saving...',
      saveButton: 'Save changes',
      previewButton: 'Preview ↗',
      genericError: 'Error',
    },
    adminDistributorsPage: {
      title: 'Distributors',
      subtitleSuffix: 'distributors registered on the platform',
      searchPlaceholder: 'Search by name or email...',
      search: 'Search',
      newDistributor: '+ New distributor',
      createTitle: 'Add a new distributor',
      nameLabel: 'Distributor name *',
      slugLabel: 'Slug *',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      commissionRateLabel: 'Commission rate (%)',
      creating: 'Creating...',
      create: 'Create distributor',
      cancel: 'Cancel',
      empty: 'No distributors',
      colDistributor: 'Distributor',
      colStatus: 'Status',
      colMerchants: 'Merchants',
      colDrivers: 'Drivers',
      colCommission: 'Commission',
      colJoined: 'Joined',
      colAction: 'Action',
      view: 'View',
      approve: 'Approve',
      suspend: 'Suspend',
      activate: 'Activate',
      pageOf: 'Page {page} of {total}',
      prev: 'Previous',
      next: 'Next',
      distributorsSuffix: 'distributors',
      statuses: {
        ACTIVE: 'Active',
        PENDING: 'Pending approval',
        SUSPENDED: 'Suspended',
      },
    },
    adminDistributorDetailPage: {
      breadcrumbAdmin: 'Admin',
      breadcrumbDistributors: 'Distributors',
      merchantsUnit: 'merchants',
      driversUnit: 'drivers',
      commissionRateLabel: 'Commission rate',
      usersTitle: 'Distributor users',
      noUsers: 'No users',
      owner: 'Owner',
      admin: 'Admin',
      merchantsTitlePrefix: 'Merchants',
      noMerchants: 'No merchants yet',
      colMerchant: 'Merchant',
      colStatus: 'Status',
      colOrders: 'Orders',
      colJoined: 'Joined',
      activateDistributor: '✅ Activate distributor',
      suspendDistributor: '🚫 Suspend distributor',
      reactivateDistributor: '✅ Reactivate',
      merchantStatuses: {
        ACTIVE: 'Active',
        PENDING: 'Pending',
        SUSPENDED: 'Suspended',
        CLOSED: 'Closed',
      },
    },
    adminFinancePage: {
      title: 'Finance',
      subtitle: 'A full financial overview across the platform',
      kpiTotalRevenue: 'Total revenue (all orders)',
      kpiMonthRevenue: "This month's revenue",
      kpiTotalCommission: 'Total commission collected',
      kpiTotalPaidOut: 'Total paid out to merchants',
      kpiTotalSettlements: 'Total settlements',
      kpiPendingSettlements: 'Pending settlements',
      distributorsSummaryTitle: 'Distributors financial summary',
      distributorsSummarySubtitle: 'Base commission rate for each distributor',
      noDistributors: 'No distributors',
      colDistributor: 'Distributor',
      colStatus: 'Status',
      colMerchants: 'Merchants',
      colCommissionRate: 'Commission rate',
    },
    adminMerchantsPage: {
      title: 'Merchants',
      subtitleSuffix: 'merchants on the platform',
      filterAll: 'All',
      empty: 'No merchants',
      colMerchant: 'Merchant',
      colBusinessType: 'Business type',
      colDistributor: 'Distributor',
      colStatus: 'Status',
      colOrders: 'Orders',
      colProducts: 'Products',
      colJoined: 'Registered',
      direct: 'Direct',
      pageOf: 'Page {page} of {total}',
      prev: 'Previous',
      next: 'Next',
      businessTypes: {
        RESTAURANT: 'Restaurant',
        GROCERY: 'Grocery',
        PHARMACY: 'Pharmacy',
        ELECTRONICS: 'Electronics',
        FASHION: 'Fashion',
        FLOWERS: 'Flowers',
        BAKERY: 'Bakery',
        OTHER: 'Other',
      },
    },
    adminSettingsPage: {
      title: 'Platform Settings',
      subtitle: 'General settings for the Waslak platform',
      platformName: 'Platform name',
      defaultCurrency: 'Default currency',
      timezone: 'Timezone',
      systemVersion: 'System version',
      environment: 'Environment',
      advancedNote: 'Advanced settings are managed via environment variables in',
    },
    adminUsersPage: {
      title: 'Platform Users',
      subtitlePrefix: 'PLATFORM_OWNER accounts —',
      empty: 'No users',
      colUser: 'User',
      colEmail: 'Email',
      colRole: 'Role',
      colVerification: 'Verification',
      colCreated: 'Created',
      verified: '✓ Verified',
      unverified: 'Unverified',
      addUserNote: 'To add a new platform user, create an account from the registration page then update the role to',
    },
    driverShared: {
      statuses: {
        OFFLINE: 'Offline',
        ONLINE: 'Available',
        BUSY: 'Busy',
        ON_BREAK: 'On break',
      },
      vehicles: {
        MOTORCYCLE: '🏍️ Motorcycle',
        CAR: '🚗 Car',
        BICYCLE: '🚲 Bicycle',
        VAN: '🚐 Van',
      },
    },
    deliveryCompaniesPage: {
      title: 'Delivery Companies',
      subtitle: 'External delivery companies orders can be handed off to instead of your own drivers',
      assignDrivers: 'Assign drivers →',
      newCompany: '+ New delivery company',
      cancel: 'Cancel',
      createTitle: 'New delivery company',
      editTitle: 'Edit company',
      nameLabel: 'Company name *',
      namePlaceholder: 'Example: iMile',
      contactNameLabel: 'Contact name',
      phoneLabel: 'Phone number',
      saving: 'Saving...',
      save: 'Save',
      create: 'Create',
      empty: 'No delivery companies yet',
      emptySubtitle: 'Add an external delivery company to hand off orders when needed',
      active: 'Active',
      suspended: 'Suspended',
      driversSuffix: 'drivers',
      linkedMerchantsSuffix: 'linked merchants',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Delete "{name}"?',
    },
    deliveryCompanyDriversPage: {
      breadcrumb: 'Assign drivers',
      title: 'Assign drivers',
      subtitle: 'Link any of your drivers to a delivery company if they represent it in the field',
      colDriver: 'Driver',
      colPhone: 'Phone',
      colCompany: 'Represents company',
      internalOption: '— Internal driver (no company) —',
      empty: 'No drivers yet',
    },
    dispatchPage: {
      title: 'Dispatch Board',
      subtitle: 'Assign drivers to orders ready for delivery',
      needsDriverTitle: 'Orders needing a driver',
      availableDriversTitle: 'Available drivers',
      noAvailableDrivers: 'No drivers available right now',
      deliveriesSuffix: 'deliveries',
      noPendingOrders: 'No pending orders',
      noPendingOrdersSubtitle: 'All orders have an assigned driver',
      chooseDriver: 'Choose a driver...',
      assign: 'Assign',
      noDriversAvailable: 'No drivers available — add drivers first',
      minAbbr: 'm',
    },
    driversPage: {
      title: 'Drivers',
      subtitle: 'Manage your delivery team',
      addDriver: '+ Add driver',
      statTotal: 'Total drivers',
      statOnline: 'Available now',
      statBusy: 'Busy',
      statOffline: 'Offline',
      searchPlaceholder: 'Search by name or phone number...',
      empty: 'No drivers',
      emptySubtitle: 'Add drivers to start delivery operations',
      colDriver: 'Driver',
      colVehicle: 'Vehicle',
      colStatus: 'Status',
      colRating: 'Rating',
      colDeliveries: 'Deliveries',
      colLastActive: 'Last active',
      colActions: 'Actions',
      unknown: 'Unknown',
      view: 'View',
      deactivate: 'Deactivate',
      activate: 'Activate',
      delete: 'Delete',
      confirmDelete: 'Delete driver "{name}"?',
    },
    driverProfilePage: {
      breadcrumb: 'Drivers',
      totalDeliveries: 'Total deliveries',
      rating: 'Rating',
      vehicleLabel: 'Vehicle',
      plateLabel: 'Plate',
      nationalIdLabel: 'National ID',
      statusLabel: 'Status',
      active: 'Active',
      suspended: 'Suspended',
      verificationLabel: 'Verification',
      verified: '✓ Verified',
      unverified: 'Unverified',
      earningsTitle: 'Earnings & dues',
      earningsDesc: "View the driver's detailed earnings history",
      quickActionsTitle: 'Quick actions',
      unverify: 'Remove verification',
      verify: '✓ Verify driver',
      deactivate: 'Deactivate driver',
      activate: 'Activate driver',
      recentDeliveriesTitle: 'Recent deliveries',
      noDeliveries: 'No deliveries yet',
      orderPrefix: 'Order #',
      delivered: 'Delivered',
      inProgress: 'In progress',
      recentEarningsTitle: 'Recent earnings',
    },
    driverEarningsPage: {
      breadcrumb: 'Earnings & dues',
      titlePrefix: 'Earnings —',
      subtitlePrefix: 'Total',
      transactionsSuffix: 'transactions',
      grandTotal: 'Grand total',
      empty: 'No earnings recorded',
      emptySubtitle: "The driver's earnings will appear here once deliveries are completed",
      colType: 'Type',
      colDescription: 'Description',
      colOrder: 'Order',
      colAmount: 'Amount',
      colDate: 'Date',
      pageOf: 'Page {page} of {total}',
      prev: 'Previous',
      next: 'Next',
      types: {
        DELIVERY: 'Delivery fee',
        BONUS: 'Bonus',
        DEDUCTION: 'Deduction',
        TIP: 'Tip',
        PAYOUT: 'Payout',
      },
    },
    newDriverPage: {
      breadcrumb: 'Drivers',
      title: 'Add new driver',
      fullNameLabel: 'Full name *',
      fullNamePlaceholder: 'Mohamed Ahmed',
      phoneLabel: 'Phone number *',
      nationalIdLabel: 'National ID',
      nationalIdPlaceholder: 'Optional',
      vehicleTypeLabel: 'Vehicle type *',
      platePlaceholder: 'ABC 1234',
      notesLabel: 'Notes',
      notesPlaceholder: 'Any optional notes...',
      saving: 'Saving...',
      submit: 'Add driver',
      cancel: 'Cancel',
    },
    distributorFinancePage: {
      title: 'Finance',
      subtitle: 'An overview of earnings and commissions',
      settlementsLink: 'Settlements',
      commissionPlansLink: 'Commission plans',
      sectionMerchants: 'Merchants',
      statMerchants: 'Merchants',
      statActiveMerchants: 'Active merchants',
      statPendingSettlements: 'Pending settlements',
      sectionFinance: 'Finance',
      statTotalRevenue: 'Total earnings',
      statTotalFees: 'Total fees',
      statTotalCommissions: 'Total commissions',
      merchantAccountTitle: 'Merchant accounts',
      merchantAccountSubtitle: 'Commissions and dues per merchant',
      createSettlementLink: 'Create settlement ←',
      noMerchants: 'No merchants yet',
      colMerchant: 'Merchant',
      colCommissionPlan: 'Commission plan',
      colOrders: 'Orders',
      colTotalSales: 'Total sales',
      colCommission: 'Commission',
      colMerchantNet: 'Merchant net',
      colStatus: 'Status',
      colAction: 'Action',
      noPlan: 'No plan',
      settle: 'Settle',
      quickCommissions: 'Commission plans',
      quickCommissionsDesc: 'Manage commission structures for merchants',
      quickSettlements: 'Settlements',
      quickSettlementsDesc: 'View and create financial settlements',
      quickPriceLists: 'Price lists',
      quickPriceListsDesc: 'Manage delivery zones and fees',
      commissionTypes: {
        PERCENTAGE: 'Percentage',
        FLAT_FEE: 'Flat fee',
        HYBRID: 'Hybrid',
        SUBSCRIPTION: 'Monthly subscription',
      },
      statuses: {
        ACTIVE: 'Active',
        PENDING: 'Pending',
        SUSPENDED: 'Suspended',
        CLOSED: 'Closed',
      },
    },
    distributorCommissionsPage: {
      breadcrumb: 'Commission plans',
      title: 'Commission plans',
      subtitle: 'Define commission structures for merchants',
      default: 'Default',
      rateOrFees: 'Rate / fees',
      minFee: 'Minimum fee',
      linkedMerchants: 'Linked merchants',
      active: 'Active',
      disabled: 'Disabled',
      delete: 'Delete',
      addNew: 'Add new plan',
      modalTitle: 'Create a new commission plan',
      nameLabel: 'Plan name *',
      namePlaceholder: 'Example: Premium Merchant Plan',
      typeLabel: 'Commission type *',
      rateLabelPercent: 'Rate (%)',
      rateLabelAmount: 'Amount',
      minFeeLabel: 'Minimum fee',
      descriptionLabel: 'Description (optional)',
      descriptionPlaceholder: 'A brief description of the plan...',
      setDefault: 'Set as default plan',
      saving: 'Saving...',
      save: 'Save plan',
      cancel: 'Cancel',
      confirmDelete: 'Are you sure you want to delete this plan?',
      types: {
        PERCENTAGE: 'Percentage %',
        FLAT_FEE: 'Flat fee',
        HYBRID: 'Hybrid (percentage + minimum)',
        SUBSCRIPTION: 'Monthly subscription',
      },
    },
    distributorPriceListsPage: {
      breadcrumb: 'Price lists',
      title: 'Price & Delivery Lists',
      subtitle: 'Set delivery fees per zone — Last Mile Pricing',
      zonesSuffix: 'delivery zones',
      addZone: '+ Add zone',
      empty: 'No delivery zones',
      emptySubtitle: 'Add delivery zones and set their fees',
      baseFee: 'Base fee',
      perKmFee: 'Fee/km',
      maxDistance: 'Max distance',
      kmUnit: 'km',
      deliveryTime: 'Delivery time',
      active: 'Active',
      disabled: 'Disabled',
      disable: 'Disable',
      enable: 'Enable',
      delete: 'Delete',
      confirmDelete: 'Delete this zone?',
      modalTitle: 'Add delivery zone',
      zoneNameLabel: 'Zone name *',
      zoneNamePlaceholder: 'Example: Central Khartoum',
      descriptionLabel: 'Description (optional)',
      descriptionPlaceholder: 'Zone description',
      baseFeeLabel: 'Base fee *',
      perKmFeeLabel: 'Fee/km',
      maxDistanceLabel: 'Max distance (km)',
      maxDistanceOptional: 'Optional',
      deliveryTimeLabel: 'Delivery time',
      deliveryTimePlaceholder: '30-45 minutes',
      saving: 'Saving...',
      save: 'Save zone',
      cancel: 'Cancel',
    },
    distributorSettlementsPage: {
      breadcrumb: 'Settlements',
      title: 'Settlements',
      subtitle: 'Manage financial settlements with merchants',
      totalSales: 'Total sales',
      totalCommissions: 'Total commissions',
      totalMerchantNet: 'Total merchant net',
      settlementsSuffix: 'settlements',
      createSettlement: '+ Create settlement',
      empty: 'No settlements yet',
      colMerchant: 'Merchant',
      colPeriod: 'Period',
      colOrders: 'Orders',
      colSales: 'Sales',
      colCommission: 'Commission',
      colNet: 'Net',
      colStatus: 'Status',
      colAction: 'Action',
      confirmPayment: 'Confirm payment',
      confirmMarkPaid: 'Confirm this settlement is complete?',
      modalTitle: 'Create a new settlement',
      merchantLabel: 'Merchant *',
      chooseMerchant: 'Choose merchant',
      fromLabel: 'From',
      toLabel: 'To',
      notesLabel: 'Notes',
      notesPlaceholder: 'Optional notes...',
      calculating: 'Calculating...',
      create: 'Create settlement',
      cancel: 'Cancel',
      statuses: {
        PENDING: 'Pending',
        PROCESSING: 'Processing',
        COMPLETED: 'Completed',
        FAILED: 'Failed',
      },
    },
    distributorMerchantsPage: {
      title: 'Merchants',
      subtitle: 'Manage your merchant accounts',
      addMerchant: '+ Add Merchant',
      empty: 'No merchants yet.',
      addFirst: 'Add your first merchant',
      colMerchant: 'Merchant',
      colStoreType: 'Store Type',
      colStatus: 'Status',
      colBranches: 'Branches',
      colUsers: 'Users',
      colOrders: 'Orders',
      colDeliveryCo: 'Delivery Co.',
      colActions: 'Actions',
      manage: 'Manage',
      none: '— none —',
      suspend: 'Suspend',
      activate: 'Activate',
      approve: 'Approve',
      reactivate: 'Reactivate',
      confirmSuspend: 'Suspend this merchant? Their storefront will stop accepting orders.',
      storeTypes: {
        FOOD_MENU: 'Food Menu',
        ONLINE_STORE: 'Online Store',
        SERVICES: 'Services',
        BOOKING: 'Booking',
        OTHER: 'Other',
      },
      statuses: {
        ACTIVE: 'Active',
        PENDING: 'Pending',
        SUSPENDED: 'Suspended',
        CLOSED: 'Closed',
      },
    },
    distributorMerchantDetailPage: {
      breadcrumb: 'Merchants',
      branchesTitle: '🏠 Branches',
      noBranches: 'No branches',
      main: 'Main',
      inactive: 'Inactive',
      usersTitle: '👤 Users',
      noUsers: 'No users',
      owner: 'Owner',
      deliveryCompanyTitle: '🚚 Delivery Company',
      deliveryCompanyDesc: "Default delivery company for this merchant's orders",
      noneOption: '— none —',
    },
    distributorNewMerchantPage: {
      title: 'Add Merchant',
      subtitle: "Enter the basics — we'll send them a link via WhatsApp to complete their own registration.",
      storeNameLabel: 'Store name',
      storeNamePlaceholder: 'e.g. مطعم الشيف',
      phoneLabel: 'Phone number (WhatsApp)',
      phonePlaceholder: '+249 9X XXX XXXX',
      locationLabel: 'Location',
      locationPlaceholder: 'e.g. الخرطوم، السوق العربي',
      cancel: 'Cancel',
      sending: 'Sending invite...',
      submit: 'Send registration link',
      sentTitle: 'Invitation sent',
      sentDescPrefix: 'A registration link was sent to',
      sentDescSuffix: 'via WhatsApp. The merchant can use it to finish setting up their store and confirm their account.',
      backToMerchants: 'Back to Merchants',
      genericError: 'Something went wrong',
    },
    distributorOrdersPage: {
      title: 'Orders',
      subtitle: 'All orders across every merchant you manage',
      tabActive: 'Active orders',
      tabArchived: 'Archived orders',
      tabAll: 'All orders',
      searchPlaceholder: 'Search by order number, recipient name or phone',
      search: 'Search',
      empty: 'No orders',
      colOrderNumber: 'Order #',
      colSender: 'Sender (merchant)',
      colRecipient: 'Recipient name',
      colStatus: 'Status',
      colDeliveryCompany: 'Delivery company',
      colAmount: 'Amount',
      ownDriversOption: '— with our drivers —',
      statuses: {
        NEW: 'New',
        ACCEPTED: 'Accepted',
        PREPARING: 'Preparing',
        READY: 'Ready',
        OUT_FOR_DELIVERY: 'Out for delivery',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled',
        REJECTED: 'Rejected',
      },
    },
    distributorUsersPage: {
      title: 'Users',
      subtitle: "Manage your distributor account's staff and permissions",
      inviteUser: '+ Invite user',
      cancel: 'Cancel',
      invitedMessage: 'Invited {email} — a password setup link has been sent to them',
      inviteTitle: 'Invite a new user',
      emailLabel: 'Email *',
      roleLabel: 'Role',
      isOwnerLabel: 'Account owner',
      sending: 'Sending...',
      sendInvite: 'Send invite',
      empty: 'No users yet',
      colName: 'Name',
      colContact: 'Email / Phone',
      colRole: 'Role',
      colOwner: 'Is owner',
      colStatus: 'Status',
      colActions: 'Actions',
      you: '(you)',
      yes: 'Yes',
      no: 'No',
      active: 'Active',
      suspended: 'Suspended',
      deactivate: 'Deactivate',
      activate: 'Activate',
      cannotDeactivateSelf: 'You cannot deactivate your own account',
      roles: {
        DISTRIBUTOR_OWNER: 'Owner',
        DISTRIBUTOR_ADMIN: 'General manager',
      },
    },
    orderDetailPage: {
      backToOrders: '← Back to orders',
      orderNumberPrefix: 'Order #',
      cancelOrder: 'Cancel order',
      rejectOrder: 'Reject order',
      itemsTitle: 'Ordered items',
      unknownProduct: 'Item',
      noteLabel: 'Note:',
      subtotal: 'Subtotal',
      deliveryFee: 'Delivery fee',
      discount: 'Discount',
      tax: 'Tax',
      total: 'Total',
      statusHistoryTitle: 'Status history',
      customerInfoTitle: 'Customer info',
      deliveryPaymentTitle: 'Delivery & payment',
      deliveryMethodLabel: 'Delivery method',
      paymentMethodLabel: 'Payment method',
      branchLabel: 'Branch',
      notesTitle: 'Notes',
      customerNotePrefix: 'Customer:',
      internalNotePrefix: 'Internal:',
      deliveryMethods: {
        PICKUP: 'Branch pickup',
        MERCHANT_DELIVERY: 'Merchant delivery',
        WASLAK_DELIVERY: 'Waslak delivery',
        EXTERNAL_DELIVERY: 'External delivery',
      },
      paymentMethods: {
        CASH: 'Cash on delivery',
        CARD: 'Card',
        ONLINE: 'Online payment',
        WALLET: 'Wallet',
      },
    },
    statusTabsAll: 'All',
    productFormPage: {
      addTitle: 'Add Product',
      addSubtitle: 'New product will be visible to customers once marked active.',
      editTitle: 'Edit Product',
      genericError: 'Something went wrong',
      nameLabel: 'Product Name',
      namePlaceholder: 'e.g. Chicken Shawarma',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Optional description...',
      categoryLabel: 'Category',
      selectCategoryPlaceholder: 'Select a category…',
      priceLabel: 'Price (SDG)',
      comparePriceLabel: 'Compare-at Price',
      comparePricePlaceholder: 'Optional',
      skuLabel: 'SKU',
      skuPlaceholder: 'Optional stock-keeping unit',
      activeToggleLabel: 'Active (visible to customers)',
      featuredToggleLabel: 'Featured',
      cancel: 'Cancel',
      saving: 'Saving…',
      saveChanges: 'Save Changes',
      createProduct: 'Create Product',
      searchPlaceholder: 'Search products...',
      filterAllStatus: 'All Status',
      filterActive: 'Active',
      filterInactive: 'Inactive',
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
      viewAllNotifications: 'عرض كل الإشعارات',
      settings: 'الإعدادات',
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
    crmCustomersPage: {
      breadcrumb: 'العملاء',
      title: 'العملاء',
      searchPlaceholder: 'بحث بالاسم أو الهاتف...',
      segmentAll: 'الكل',
      colCustomer: 'العميل',
      colSegment: 'الشريحة',
      colOrders: 'الطلبات',
      colSpent: 'الإنفاق',
      colLastOrder: 'آخر طلب',
      colAction: '',
      view: 'عرض',
      empty: 'لا يوجد عملاء',
      emptySubtitle: 'ستظهر بيانات العملاء بعد استلام الطلبات',
      segments: {
        NEW: 'جديد',
        REGULAR: 'منتظم',
        VIP: 'VIP',
        INACTIVE: 'غير نشط',
        BLOCKED: 'محظور',
      },
    },
    loyaltyPage: {
      breadcrumb: 'نقاط الولاء',
      title: 'برنامج الولاء',
      subtitle: 'كافئ عملاءك المميزين بنقاط قابلة للاستبدال',
      programSettings: 'إعدادات البرنامج',
      programSettingsDesc: 'تفعيل وضبط قواعد كسب النقاط',
      pointsPerOrderLabel: 'نقاط لكل طلب',
      pointsPerSDGLabel: 'نقاط لكل جنيه SDG',
      redemptionThresholdLabel: 'حد الاستبدال (نقاط)',
      redemptionValueLabel: 'قيمة الاستبدال (SDG)',
      summaryTitle: 'ملخص البرنامج',
      summaryLine1: 'العميل يكسب {a} نقطة + {b} نقطة/SDG لكل طلب.',
      summaryLine2: 'عند بلوغ {c} نقطة يحصل على خصم {d} SDG.',
      save: 'حفظ الإعدادات',
      saving: 'جاري الحفظ...',
      saved: '✓ تم الحفظ',
      leaderboardTitle: '🏆 أصحاب أعلى النقاط',
      unknownCustomer: '—',
    },
    customerProfilePage: {
      ordersUnit: 'طلب',
      loyaltyPoints: 'نقاط الولاء',
      ordersHistory: 'سجل الطلبات',
      noOrders: 'لا توجد طلبات',
      statusDelivered: 'تم',
      statusCancelled: 'ملغي',
      statusInProgress: 'جارٍ',
      actions: 'إجراءات',
      unblock: '✓ إلغاء الحظر',
      block: '⛔ حظر العميل',
      confirmUnblock: 'إلغاء حظر هذا العميل؟',
      confirmBlock: 'حظر هذا العميل من الطلب؟',
      notes: 'ملاحظات',
      edit: 'تعديل',
      save: 'حفظ',
      cancel: 'إلغاء',
      noNotes: 'لا توجد ملاحظات',
    },
    financeHomePage: {
      title: 'المالية',
      subtitle: 'نظرة شاملة على أرباحك وعمولاتك ومستحقاتك',
      totalRevenue: 'إجمالي المبيعات',
      completedOrdersSuffix: 'طلب مكتمل',
      monthRevenue: 'مبيعات الشهر الحالي',
      ordersSuffix: 'طلب',
      estimatedCommission: 'العمولة المقدرة (الشهر)',
      basedOnPlan: 'بناءً على خطة العمولة',
      estimatedNet: 'الصافي المتوقع (الشهر)',
      afterCommission: 'بعد خصم العمولة',
      commissionPlanTitle: 'خطة العمولة',
      rateOrAmount: 'النسبة / المبلغ',
      minFeeLabel: 'الحد الأدنى للعمولة',
      noPlanTitle: 'لم يتم تعيين خطة عمولة بعد',
      noPlanDesc: 'تواصل مع المشغّل لتعيين خطة عمولة مناسبة',
      commissionTypes: {
        PERCENTAGE: 'نسبة مئوية',
        FLAT_FEE: 'رسوم ثابتة',
        HYBRID: 'مختلط',
        SUBSCRIPTION: 'اشتراك شهري',
      },
      commissionDescPercentage: 'يُحتسب {rate}% من إجمالي قيمة كل طلب مكتمل.',
      commissionDescFlatFee: 'رسوم ثابتة {rate} {cur} على كل طلب مكتمل.',
      commissionDescHybrid: 'الأعلى بين {rate}% من المبيعات أو {minFee} {cur} لكل طلب.',
      commissionDescSubscription: 'رسوم اشتراك ثابتة شهرية بمقدار {rate} {cur}.',
      settlementsTitle: 'التسويات',
      viewAll: 'عرض الكل ←',
      pendingSettlement: 'تسوية معلقة',
      noPreviousSettlement: 'لا توجد تسوية سابقة',
      viewSettlementsHistory: 'عرض سجل التسويات',
      transactionsCardTitle: 'سجل المعاملات',
      transactionsCardDesc: 'عرض جميع الحركات المالية',
      settlementsCardTitle: 'التسويات المالية',
      settlementsCardDesc: 'تتبع حالة التسويات والمدفوعات',
      reportsCardTitle: 'التقارير المالية',
      reportsCardDesc: 'تقارير تفصيلية حسب الفترة',
    },
    financeSettlementsPage: {
      breadcrumb: 'التسويات',
      title: 'سجل التسويات',
      subtitlePrefix: 'مدفوعاتك الواردة من المشغّل —',
      subtitleSuffix: 'تسوية',
      all: 'الكل',
      empty: 'لا توجد تسويات',
      emptySubtitle: 'ستظهر هنا التسويات التي ينشئها المشغّل لمتجرك',
      completedOrdersSuffix: 'طلب مكتمل',
      netDue: 'صافي المستحق',
      totalSales: 'إجمالي المبيعات',
      commissionCharged: 'العمولة المحتسبة',
      otherFees: 'رسوم أخرى',
      paidOn: 'تم الدفع في',
      pageOf: 'صفحة {page} من {total}',
      prev: 'السابق',
      next: 'التالي',
      statuses: {
        PENDING: 'معلقة',
        PROCESSING: 'قيد المعالجة',
        COMPLETED: 'مكتملة',
        FAILED: 'فشلت',
      },
    },
    financeTransactionsPage: {
      breadcrumb: 'سجل المعاملات',
      title: 'سجل المعاملات',
      subtitlePrefix: 'جميع الحركات المالية لمتجرك —',
      subtitleSuffix: 'معاملة',
      all: 'الكل',
      empty: 'لا توجد معاملات',
      emptySubtitle: 'ستظهر هنا معاملاتك المالية بمجرد تنفيذ الطلبات',
      colType: 'النوع',
      colDescription: 'الوصف',
      colReference: 'المرجع',
      colAmount: 'المبلغ',
      colDate: 'التاريخ',
      pageOf: 'صفحة {page} من {total}',
      prev: 'السابق',
      next: 'التالي',
      types: {
        ORDER_PAYMENT: 'دفع طلب',
        COMMISSION: 'عمولة',
        REFUND: 'استرداد',
        SUBSCRIPTION_FEE: 'رسوم اشتراك',
        DELIVERY_FEE: 'رسوم توصيل',
        ADJUSTMENT: 'تعديل',
        PAYOUT: 'صرف',
      },
    },
    fulfillmentPage: {
      title: 'لوحة التشغيل',
      subtitle: 'تتبع الطلبات النشطة بشكل مباشر — يتحدث كل 30 ثانية',
      allOrders: 'كل الطلبات →',
      statToday: 'طلبات اليوم',
      statActive: 'طلبات نشطة',
      statDelivered: 'تم التوصيل',
      statRevenue: 'إيرادات اليوم',
      statAvgPrep: 'متوسط وقت التحضير',
      avgPrepSuffix: 'للطلبات المكتملة',
      live: 'مباشر',
      activeOrdersSuffix: 'طلب نشط',
      lastUpdated: 'آخر تحديث:',
      refresh: '↻ تحديث',
      dismiss: 'تجاهل',
      emptyColumn: 'لا توجد طلبات',
      details: 'تفاصيل',
      delayed: '⚠ متأخر',
      unknownProduct: 'منتج',
      unknownCustomer: '—',
      otherItemsSuffix: 'أصناف أخرى',
      itemsSuffix: 'أصناف',
      cancel: 'إلغاء',
      reject: 'رفض',
      minuteAbbr: 'د',
      hourAbbr: 'س',
      columns: {
        NEW: 'جديد',
        ACCEPTED: 'مقبول',
        PREPARING: 'قيد التحضير',
        READY: 'جاهز',
        OUT_FOR_DELIVERY: 'في الطريق',
        DELIVERED: 'تم التوصيل',
      },
      nextStatusLabel: {
        NEW: 'قبول الطلب',
        ACCEPTED: 'بدء التحضير',
        PREPARING: 'جاهز للاستلام',
        READY: 'خرج للتوصيل',
        OUT_FOR_DELIVERY: 'تم التوصيل',
      },
    },
    inboxPage: {
      title: 'صندوق الوارد',
      filterAll: 'الكل',
      filterOpen: 'مفتوح',
      filterClosed: 'مغلق',
      emptyConversations: 'لا توجد محادثات',
      unknownCustomer: 'عميل مجهول',
      customer: 'عميل',
      closeConversation: 'إغلاق المحادثة',
      you: 'أنت',
      suggestReplyTitle: 'اقترح رداً بالذكاء الاصطناعي',
      suggestReplyButton: '✨ اقترح رد',
      suggestReplyLoading: '...',
      suggestFailed: 'تعذر توليد اقتراح',
      savedButFailedPrefix: 'تم الحفظ لكن تعذّر إرساله عبر واتساب:',
      inputPlaceholder: 'اكتب ردك...',
      send: 'إرسال',
      conversationClosed: 'المحادثة مغلقة',
      selectConversation: 'اختر محادثة للبدء',
      statuses: {
        OPEN: 'مفتوح',
        PENDING: 'معلّق',
        CLOSED: 'مغلق',
      },
    },
    settingsPage: {
      title: 'الإعدادات',
      subtitle: 'إدارة إعدادات متجرك وواجهة العرض',
      saved: 'تم الحفظ',
      saving: 'جاري الحفظ...',
      storeProfileTitle: 'ملف المتجر',
      storeProfileDesc: 'اسم النشاط وبيانات التواصل',
      businessName: 'اسم النشاط التجاري',
      description: 'الوصف',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      saveProfile: 'حفظ الملف',
      storefrontTitle: 'واجهة المتجر',
      storefrontDesc: 'خيارات الطلب التي يراها العملاء',
      isOpenLabel: 'المتجر مفتوح لاستقبال الطلبات',
      deliveryEnabledLabel: 'التوصيل مفعّل',
      pickupEnabledLabel: 'الاستلام من المتجر مفعّل',
      minOrderLabel: 'الحد الأدنى لمبلغ الطلب (SDG)',
      welcomeMessageLabel: 'رسالة الترحيب',
      welcomePlaceholder: 'تظهر أعلى واجهة متجرك',
      saveStorefront: 'حفظ واجهة المتجر',
      whatsappTitle: 'قناة واتساب',
      whatsappDesc: 'اربط رقم واتساب بزنس الخاص بك لاستقبال والرد على العملاء من صندوق الوارد',
      connected: 'متصل',
      disconnected: 'معطّل',
      webhookUrlLabel: 'رابط Webhook (أضفه في إعدادات واتساب لتطبيق Meta الخاص بك)',
      phoneNumberIdLabel: 'معرّف رقم الهاتف (Phone Number ID)',
      phoneNumberIdPlaceholder: 'من Meta Business Suite',
      wabaIdLabel: 'معرّف حساب واتساب بزنس (اختياري)',
      displayPhoneLabel: 'رقم الهاتف الظاهر (اختياري)',
      displayPhonePlaceholder: '+2499xxxxxxxx',
      accessTokenLabel: 'رمز الوصول (Access Token)',
      accessTokenCurrentPrefix: 'الحالي:',
      accessTokenPlaceholderConfigured: 'اتركه فارغاً للاحتفاظ بالرمز الحالي',
      accessTokenPlaceholderNew: 'رمز وصول مستخدم النظام من Meta',
      updateConnection: 'تحديث الاتصال',
      connectWhatsapp: 'ربط واتساب',
      disconnect: 'إلغاء الربط',
      whatsappNote: 'ملاحظة: يسمح واتساب بالرد الحر خلال 24 ساعة فقط من آخر رسالة للعميل — خارج هذه الفترة تتطلب الرسائل قالباً معتمداً مسبقاً.',
    },
    reportsPage: {
      title: 'التقارير والإحصاءات',
      subtitle: 'تحليل شامل للمبيعات والتشغيل',
      ranges: {
        today: 'اليوم',
        yesterday: 'أمس',
        week: '7 أيام',
        month: '30 يوم',
        quarter: '3 أشهر',
      },
      kpiTotalOrders: 'إجمالي الطلبات',
      kpiRevenue: 'الإيرادات',
      kpiAvgOrder: 'متوسط الطلب',
      kpiCancellationRate: 'نسبة الإلغاء',
      kpiNewCustomers: 'عملاء جدد',
      changeSuffix: 'عن الفترة السابقة',
      revenueTrendTitle: 'منحنى الإيرادات',
      revenueTrendSubtitle: 'الأعمدة = الإيراد (SDG) · الخط = عدد الطلبات',
      totalSuffix: 'SDG إجمالي',
      statusDistTitle: 'توزيع حالات الطلبات',
      statusDistSubtitlePrefix: 'إجمالي',
      statusDistSubtitleSuffix: 'طلب',
      noData: 'لا توجد بيانات',
      peakHoursTitle: 'ساعات الذروة',
      peakBadgePrefix: 'ذروة',
      peakHoursSubtitle: 'توزيع الطلبات خلال اليوم',
      topProductsTitle: 'أكثر المنتجات مبيعاً',
      topProductsSubtitle: 'بناءً على الكمية المباعة من الطلبات المكتملة',
      colRank: '#',
      colProduct: 'المنتج',
      colQuantity: 'الكمية',
      colRevenue: 'الإيراد',
      financialSummaryTitle: 'الملخص المالي',
      grossSales: 'إجمالي المبيعات',
      deliveryFees: 'رسوم التوصيل',
      discounts: 'الخصومات',
      netRevenue: 'صافي الإيراد',
      legendNet: 'صافي',
      legendDelivery: 'توصيل',
      legendDiscounts: 'خصومات',
      topCustomersTitle: 'أفضل العملاء',
      viewAll: 'عرض الكل',
      ordersSuffix: 'طلب',
      branchPerformanceTitle: 'أداء الفروع',
      noBranches: 'لا توجد فروع',
      cancellationsSuffix: 'إلغاء',
      tooltipRevenue: 'الإيراد',
      tooltipOrders: 'الطلبات',
      tooltipQuantity: 'الكمية',
    },
    storefrontHomePage: {
      title: 'المتجر الإلكتروني',
      subtitle: 'إدارة واجهة متجرك للعملاء',
      viewStore: '🔗 عرض المتجر',
      statStoreStatus: 'حالة المتجر',
      statOpen: 'مفتوح',
      statClosed: 'مغلق',
      statDelivery: 'التوصيل',
      statPickup: 'الاستلام',
      statMinOrder: 'الحد الأدنى',
      statEnabled: 'مفعّل',
      statDisabled: 'معطّل',
      storeUrlLabel: 'رابط متجرك',
      openLink: 'فتح ↗',
      linkCustomizeTitle: 'تخصيص الهوية',
      linkCustomizeDesc: 'الألوان، اللوقو، البانر، ساعات العمل',
      linkAiTitle: 'مولّد AI',
      linkAiDesc: 'أنشئ محتوى متجرك بالذكاء الاصطناعي',
      linkProductsTitle: 'إدارة المنتجات',
      linkProductsDesc: 'أضف وعدّل منتجاتك والفئات',
      linkInboxTitle: 'صندوق الوارد',
      linkInboxDesc: 'رسائل وتواصل العملاء',
    },
    storefrontAiPage: {
      backToStore: '← المتجر',
      title: 'مولّد المتجر بالذكاء الاصطناعي',
      howItWorksTitle: '🤖 كيف يعمل؟',
      howItWorksDesc: 'اكتب وصفاً لنشاطك التجاري وسيقوم الذكاء الاصطناعي بإنشاء اسم المتجر، الوصف، الفئات، المنتجات، والألوان المناسبة تلقائياً.',
      promptLabel: 'صف نشاطك التجاري',
      promptPlaceholder: 'مثال: عندي مطعم برغر في الخرطوم، نقدم برغر لحم طازج مع مشروبات ومقبلات...',
      examplesLabel: 'أمثلة سريعة:',
      examples: [
        'عندي مطعم شاورما في الخرطوم، نخدم الوجبات السودانية والشامية',
        'متجر ملابس نسائية عصرية في أم درمان، موضة وأزياء محتشمة',
        'صالون حلاقة رجالي في بحري، قص وعناية بالشعر',
        'مخبز وحلويات منزلية، كيك وبسبوسة وحلويات تقليدية',
      ],
      generating: 'جاري التوليد...',
      generateButton: '✨ توليد المتجر',
      genericError: 'فشل التوليد',
      connectionError: 'خطأ في الاتصال',
      descriptionLabel: 'الوصف',
      welcomeMessageLabel: 'رسالة الترحيب',
      categoriesLabel: 'الفئات والمنتجات المقترحة',
      primaryColorLabel: 'اللون الرئيسي',
      applyingButton: 'جاري التطبيق...',
      applyButton: '🚀 تطبيق على المتجر',
      appliedMessage: '✓ تم تطبيق المحتوى على متجرك!',
    },
    storefrontCustomizePage: {
      backToStore: '← المتجر',
      title: 'تخصيص الهوية',
      previewLabel: 'معاينة الهوية',
      colorsTitle: '🎨 الألوان',
      primaryColorLabel: 'اللون الرئيسي',
      secondaryColorLabel: 'اللون الثانوي',
      imagesTitle: '🖼️ الصور والمحتوى',
      logoUrlLabel: 'رابط اللوقو',
      bannerUrlLabel: 'رابط صورة البانر',
      welcomeMessageLabel: 'رسالة الترحيب',
      welcomePlaceholder: 'مرحباً بكم في متجرنا...',
      orderSettingsTitle: '⚙️ إعدادات الطلبات',
      isOpenToggle: 'المتجر مفتوح الآن',
      deliveryToggle: 'تفعيل خدمة التوصيل',
      pickupToggle: 'تفعيل الاستلام من الفرع',
      minOrderLabel: 'الحد الأدنى للطلب (SDG)',
      socialTitle: '📱 التواصل الاجتماعي',
      whatsappLabel: 'رقم واتساب',
      instagramLabel: 'انستغرام',
      facebookLabel: 'فيسبوك',
      saved: '✓ تم الحفظ بنجاح',
      saving: 'جاري الحفظ...',
      saveButton: 'حفظ التغييرات',
      previewButton: 'معاينة ↗',
      genericError: 'خطأ',
    },
    adminDistributorsPage: {
      title: 'الموزعون',
      subtitleSuffix: 'موزع مسجّل في المنصة',
      searchPlaceholder: 'بحث بالاسم أو البريد...',
      search: 'بحث',
      newDistributor: '+ موزع جديد',
      createTitle: 'إضافة موزع جديد',
      nameLabel: 'اسم الموزع *',
      slugLabel: 'الـ Slug *',
      emailLabel: 'البريد الإلكتروني',
      phoneLabel: 'رقم الهاتف',
      commissionRateLabel: 'نسبة العمولة (%)',
      creating: 'جارٍ الإنشاء...',
      create: 'إنشاء الموزع',
      cancel: 'إلغاء',
      empty: 'لا يوجد موزعون',
      colDistributor: 'الموزع',
      colStatus: 'الحالة',
      colMerchants: 'التجار',
      colDrivers: 'السائقون',
      colCommission: 'العمولة',
      colJoined: 'تاريخ الانضمام',
      colAction: 'إجراء',
      view: 'عرض',
      approve: 'موافقة',
      suspend: 'إيقاف',
      activate: 'تفعيل',
      pageOf: 'صفحة {page} من {total}',
      prev: 'السابق',
      next: 'التالي',
      distributorsSuffix: 'موزع',
      statuses: {
        ACTIVE: 'نشط',
        PENDING: 'بانتظار الموافقة',
        SUSPENDED: 'موقوف',
      },
    },
    adminDistributorDetailPage: {
      breadcrumbAdmin: 'الادمن',
      breadcrumbDistributors: 'الموزعون',
      merchantsUnit: 'تاجر',
      driversUnit: 'سائق',
      commissionRateLabel: 'نسبة العمولة',
      usersTitle: 'مستخدمو الموزع',
      noUsers: 'لا يوجد مستخدمون',
      owner: 'مالك',
      admin: 'مشرف',
      merchantsTitlePrefix: 'التجار',
      noMerchants: 'لا يوجد تجار بعد',
      colMerchant: 'التاجر',
      colStatus: 'الحالة',
      colOrders: 'الطلبات',
      colJoined: 'تاريخ الانضمام',
      activateDistributor: '✅ تفعيل الموزع',
      suspendDistributor: '🚫 إيقاف الموزع',
      reactivateDistributor: '✅ إعادة التفعيل',
      merchantStatuses: {
        ACTIVE: 'نشط',
        PENDING: 'معلق',
        SUSPENDED: 'موقوف',
        CLOSED: 'مغلق',
      },
    },
    adminFinancePage: {
      title: 'المالية',
      subtitle: 'نظرة مالية شاملة على مستوى المنصة',
      kpiTotalRevenue: 'إجمالي الإيرادات (كل الطلبات)',
      kpiMonthRevenue: 'إيرادات الشهر الحالي',
      kpiTotalCommission: 'إجمالي العمولات المحصّلة',
      kpiTotalPaidOut: 'إجمالي المدفوع للتجار',
      kpiTotalSettlements: 'إجمالي التسويات',
      kpiPendingSettlements: 'تسويات معلقة',
      distributorsSummaryTitle: 'ملخص مالي — الموزعون',
      distributorsSummarySubtitle: 'نسبة العمولة الأساسية لكل موزع',
      noDistributors: 'لا يوجد موزعون',
      colDistributor: 'الموزع',
      colStatus: 'الحالة',
      colMerchants: 'التجار',
      colCommissionRate: 'نسبة العمولة',
    },
    adminMerchantsPage: {
      title: 'التجار',
      subtitleSuffix: 'تاجر على المنصة',
      filterAll: 'الكل',
      empty: 'لا يوجد تجار',
      colMerchant: 'التاجر',
      colBusinessType: 'النشاط',
      colDistributor: 'الموزع',
      colStatus: 'الحالة',
      colOrders: 'الطلبات',
      colProducts: 'المنتجات',
      colJoined: 'تاريخ التسجيل',
      direct: 'مباشر',
      pageOf: 'صفحة {page} من {total}',
      prev: 'السابق',
      next: 'التالي',
      businessTypes: {
        RESTAURANT: 'مطعم',
        GROCERY: 'بقالة',
        PHARMACY: 'صيدلية',
        ELECTRONICS: 'إلكترونيات',
        FASHION: 'أزياء',
        FLOWERS: 'زهور',
        BAKERY: 'مخبز',
        OTHER: 'أخرى',
      },
    },
    adminSettingsPage: {
      title: 'إعدادات المنصة',
      subtitle: 'إعدادات عامة لمنصة وصلك',
      platformName: 'اسم المنصة',
      defaultCurrency: 'العملة الافتراضية',
      timezone: 'المنطقة الزمنية',
      systemVersion: 'إصدار النظام',
      environment: 'البيئة',
      advancedNote: 'الإعدادات المتقدمة تُدار عبر متغيرات البيئة في',
    },
    adminUsersPage: {
      title: 'مستخدمو المنصة',
      subtitlePrefix: 'حسابات PLATFORM_OWNER —',
      empty: 'لا يوجد مستخدمون',
      colUser: 'المستخدم',
      colEmail: 'البريد الإلكتروني',
      colRole: 'الدور',
      colVerification: 'التحقق',
      colCreated: 'تاريخ الإنشاء',
      verified: '✓ موثّق',
      unverified: 'غير موثّق',
      addUserNote: 'لإضافة مستخدم جديد للمنصة، قم بإنشاء حساب من صفحة التسجيل ثم قم بتحديث الدور إلى',
    },
    driverShared: {
      statuses: {
        OFFLINE: 'غير متصل',
        ONLINE: 'متاح',
        BUSY: 'مشغول',
        ON_BREAK: 'استراحة',
      },
      vehicles: {
        MOTORCYCLE: '🏍️ دراجة نارية',
        CAR: '🚗 سيارة',
        BICYCLE: '🚲 دراجة',
        VAN: '🚐 فان',
      },
    },
    deliveryCompaniesPage: {
      title: 'شركات التوصيل',
      subtitle: 'شركات التوصيل الخارجية التي يمكن تسليمها الطلبات بدل سائقيك',
      assignDrivers: 'تعيين مندوبين →',
      newCompany: '+ شركة توصيل جديدة',
      cancel: 'إلغاء',
      createTitle: 'شركة توصيل جديدة',
      editTitle: 'تعديل الشركة',
      nameLabel: 'اسم الشركة *',
      namePlaceholder: 'مثال: iMile',
      contactNameLabel: 'اسم المسؤول',
      phoneLabel: 'رقم الهاتف',
      saving: 'جاري الحفظ...',
      save: 'حفظ',
      create: 'إنشاء',
      empty: 'لا توجد شركات توصيل بعد',
      emptySubtitle: 'أضف شركة توصيل خارجية لتسليمها الطلبات عند الحاجة',
      active: 'نشطة',
      suspended: 'موقوفة',
      driversSuffix: 'مندوب',
      linkedMerchantsSuffix: 'تاجر مرتبط',
      edit: 'تعديل',
      delete: 'حذف',
      confirmDelete: 'حذف "{name}"؟',
    },
    deliveryCompanyDriversPage: {
      breadcrumb: 'تعيين مندوبين',
      title: 'تعيين مندوبين',
      subtitle: 'اربط أي من سائقيك بشركة توصيل معينة إذا كان يمثلها ميدانيًا',
      colDriver: 'السائق',
      colPhone: 'الهاتف',
      colCompany: 'يمثّل شركة',
      internalOption: '— سائق داخلي (بدون شركة) —',
      empty: 'لا يوجد سائقون بعد',
    },
    dispatchPage: {
      title: 'لوحة الإرسال',
      subtitle: 'تعيين سائقين للطلبات الجاهزة للتوصيل',
      needsDriverTitle: 'طلبات تحتاج سائق',
      availableDriversTitle: 'السائقون المتاحون',
      noAvailableDrivers: 'لا يوجد سائقون متاحون الآن',
      deliveriesSuffix: 'توصيلة',
      noPendingOrders: 'لا توجد طلبات معلقة',
      noPendingOrdersSubtitle: 'جميع الطلبات عُيِّن لها سائقون',
      chooseDriver: 'اختر سائقاً...',
      assign: 'تعيين',
      noDriversAvailable: 'لا يوجد سائقون متاحون — أضف سائقين أولاً',
      minAbbr: 'د',
    },
    driversPage: {
      title: 'السائقون',
      subtitle: 'إدارة فريق التوصيل',
      addDriver: '+ إضافة سائق',
      statTotal: 'إجمالي السائقين',
      statOnline: 'متاح الآن',
      statBusy: 'مشغول',
      statOffline: 'غير متصل',
      searchPlaceholder: 'بحث بالاسم أو رقم الهاتف...',
      empty: 'لا يوجد سائقون',
      emptySubtitle: 'أضف سائقين لبدء عمليات التوصيل',
      colDriver: 'السائق',
      colVehicle: 'المركبة',
      colStatus: 'الحالة',
      colRating: 'التقييم',
      colDeliveries: 'التوصيلات',
      colLastActive: 'آخر نشاط',
      colActions: 'إجراءات',
      unknown: 'غير معروف',
      view: 'عرض',
      deactivate: 'تعطيل',
      activate: 'تفعيل',
      delete: 'حذف',
      confirmDelete: 'حذف السائق "{name}"؟',
    },
    driverProfilePage: {
      breadcrumb: 'السائقون',
      totalDeliveries: 'إجمالي التوصيلات',
      rating: 'التقييم',
      vehicleLabel: 'المركبة',
      plateLabel: 'اللوحة',
      nationalIdLabel: 'الرقم الوطني',
      statusLabel: 'الحالة',
      active: 'نشط',
      suspended: 'موقوف',
      verificationLabel: 'التحقق',
      verified: '✓ موثق',
      unverified: 'غير موثق',
      earningsTitle: 'الأرباح والمستحقات',
      earningsDesc: 'عرض سجل مكاسب السائق التفصيلي',
      quickActionsTitle: 'إجراءات سريعة',
      unverify: 'إلغاء التوثيق',
      verify: '✓ توثيق السائق',
      deactivate: 'إيقاف السائق',
      activate: 'تفعيل السائق',
      recentDeliveriesTitle: 'آخر التوصيلات',
      noDeliveries: 'لا توجد توصيلات بعد',
      orderPrefix: 'طلب #',
      delivered: 'تم التوصيل',
      inProgress: 'جاري',
      recentEarningsTitle: 'الأرباح الأخيرة',
    },
    driverEarningsPage: {
      breadcrumb: 'الأرباح والمستحقات',
      titlePrefix: 'أرباح',
      subtitlePrefix: 'إجمالي',
      transactionsSuffix: 'حركة مالية',
      grandTotal: 'الإجمالي الكلي',
      empty: 'لا توجد أرباح مسجلة',
      emptySubtitle: 'ستظهر هنا أرباح السائق بمجرد إتمام طلبات التوصيل',
      colType: 'النوع',
      colDescription: 'الوصف',
      colOrder: 'الطلب',
      colAmount: 'المبلغ',
      colDate: 'التاريخ',
      pageOf: 'صفحة {page} من {total}',
      prev: 'السابق',
      next: 'التالي',
      types: {
        DELIVERY: 'أجر توصيل',
        BONUS: 'مكافأة',
        DEDUCTION: 'خصم',
        TIP: 'إكرامية',
        PAYOUT: 'صرف',
      },
    },
    newDriverPage: {
      breadcrumb: 'السائقون',
      title: 'إضافة سائق جديد',
      fullNameLabel: 'الاسم الكامل *',
      fullNamePlaceholder: 'محمد أحمد',
      phoneLabel: 'رقم الهاتف *',
      nationalIdLabel: 'الرقم الوطني',
      nationalIdPlaceholder: 'اختياري',
      vehicleTypeLabel: 'نوع المركبة *',
      platePlaceholder: 'ABC 1234',
      notesLabel: 'ملاحظات',
      notesPlaceholder: 'أي ملاحظات اختيارية...',
      saving: 'جاري الحفظ...',
      submit: 'إضافة السائق',
      cancel: 'إلغاء',
    },
    distributorFinancePage: {
      title: 'المالية',
      subtitle: 'نظرة عامة على الأرباح والعمولات',
      settlementsLink: 'التسويات',
      commissionPlansLink: 'خطط العمولات',
      sectionMerchants: 'تجاري',
      statMerchants: 'تجاري',
      statActiveMerchants: 'تجار نشطون',
      statPendingSettlements: 'تسويات معلقة',
      sectionFinance: 'المالية',
      statTotalRevenue: 'إجمالي الأرباح',
      statTotalFees: 'إجمالي الرسوم',
      statTotalCommissions: 'إجمالي العمولات',
      merchantAccountTitle: 'حساب التجار',
      merchantAccountSubtitle: 'العمولات والمستحقات لكل تاجر',
      createSettlementLink: 'إنشاء تسوية ←',
      noMerchants: 'لا يوجد تجار حتى الآن',
      colMerchant: 'التاجر',
      colCommissionPlan: 'خطة العمولة',
      colOrders: 'الطلبات',
      colTotalSales: 'إجمالي المبيعات',
      colCommission: 'العمولة',
      colMerchantNet: 'صافي التاجر',
      colStatus: 'الحالة',
      colAction: 'إجراء',
      noPlan: 'لا توجد خطة',
      settle: 'تسوية',
      quickCommissions: 'خطط العمولات',
      quickCommissionsDesc: 'إدارة هياكل العمولة للتجار',
      quickSettlements: 'التسويات',
      quickSettlementsDesc: 'عرض وإنشاء تسويات مالية',
      quickPriceLists: 'قوائم الأسعار',
      quickPriceListsDesc: 'إدارة مناطق التوصيل والرسوم',
      commissionTypes: {
        PERCENTAGE: 'نسبة مئوية',
        FLAT_FEE: 'رسوم ثابتة',
        HYBRID: 'مختلط',
        SUBSCRIPTION: 'اشتراك شهري',
      },
      statuses: {
        ACTIVE: 'نشط',
        PENDING: 'معلق',
        SUSPENDED: 'موقوف',
        CLOSED: 'مغلق',
      },
    },
    distributorCommissionsPage: {
      breadcrumb: 'خطط العمولات',
      title: 'خطط العمولات',
      subtitle: 'حدد هياكل العمولة للتجار',
      default: 'افتراضي',
      rateOrFees: 'النسبة / الرسوم',
      minFee: 'الحد الأدنى',
      linkedMerchants: 'التجار المرتبطون',
      active: 'نشطة',
      disabled: 'معطلة',
      delete: 'حذف',
      addNew: 'إضافة خطة جديدة',
      modalTitle: 'إنشاء خطة عمولة جديدة',
      nameLabel: 'اسم الخطة *',
      namePlaceholder: 'مثال: خطة التاجر المميز',
      typeLabel: 'نوع العمولة *',
      rateLabelPercent: 'النسبة (%)',
      rateLabelAmount: 'المبلغ',
      minFeeLabel: 'الحد الأدنى',
      descriptionLabel: 'وصف (اختياري)',
      descriptionPlaceholder: 'وصف مختصر للخطة...',
      setDefault: 'تعيين كخطة افتراضية',
      saving: 'جاري الحفظ...',
      save: 'حفظ الخطة',
      cancel: 'إلغاء',
      confirmDelete: 'هل أنت متأكد من حذف هذه الخطة؟',
      types: {
        PERCENTAGE: 'نسبة مئوية %',
        FLAT_FEE: 'رسوم ثابتة',
        HYBRID: 'مختلط (نسبة + حد أدنى)',
        SUBSCRIPTION: 'اشتراك شهري',
      },
    },
    distributorPriceListsPage: {
      breadcrumb: 'قوائم الأسعار',
      title: 'قوائم الأسعار والتوصيل',
      subtitle: 'حدد رسوم التوصيل لكل منطقة — Last Mile Pricing',
      zonesSuffix: 'منطقة توصيل',
      addZone: '+ إضافة منطقة',
      empty: 'لا توجد مناطق توصيل',
      emptySubtitle: 'أضف مناطق التوصيل وحدد الرسوم',
      baseFee: 'الرسوم الأساسية',
      perKmFee: 'رسوم/كم',
      maxDistance: 'أقصى مسافة',
      kmUnit: 'كم',
      deliveryTime: 'وقت التوصيل',
      active: 'نشطة',
      disabled: 'معطلة',
      disable: 'تعطيل',
      enable: 'تفعيل',
      delete: 'حذف',
      confirmDelete: 'حذف هذه المنطقة؟',
      modalTitle: 'إضافة منطقة توصيل',
      zoneNameLabel: 'اسم المنطقة *',
      zoneNamePlaceholder: 'مثال: الخرطوم المركز',
      descriptionLabel: 'وصف (اختياري)',
      descriptionPlaceholder: 'وصف المنطقة',
      baseFeeLabel: 'الرسوم الأساسية *',
      perKmFeeLabel: 'رسوم/كم',
      maxDistanceLabel: 'أقصى مسافة (كم)',
      maxDistanceOptional: 'اختياري',
      deliveryTimeLabel: 'وقت التوصيل',
      deliveryTimePlaceholder: '30-45 دقيقة',
      saving: 'جاري الحفظ...',
      save: 'حفظ المنطقة',
      cancel: 'إلغاء',
    },
    distributorSettlementsPage: {
      breadcrumb: 'التسويات',
      title: 'التسويات',
      subtitle: 'إدارة التسويات المالية مع التجار',
      totalSales: 'إجمالي المبيعات',
      totalCommissions: 'إجمالي العمولات',
      totalMerchantNet: 'إجمالي صافي التجار',
      settlementsSuffix: 'تسوية',
      createSettlement: '+ إنشاء تسوية',
      empty: 'لا توجد تسويات حتى الآن',
      colMerchant: 'التاجر',
      colPeriod: 'الفترة',
      colOrders: 'الطلبات',
      colSales: 'المبيعات',
      colCommission: 'العمولة',
      colNet: 'الصافي',
      colStatus: 'الحالة',
      colAction: 'إجراء',
      confirmPayment: 'تأكيد الدفع',
      confirmMarkPaid: 'تأكيد إتمام هذه التسوية؟',
      modalTitle: 'إنشاء تسوية جديدة',
      merchantLabel: 'التاجر *',
      chooseMerchant: 'اختر التاجر',
      fromLabel: 'من',
      toLabel: 'إلى',
      notesLabel: 'ملاحظات',
      notesPlaceholder: 'ملاحظات اختيارية...',
      calculating: 'جاري الحساب...',
      create: 'إنشاء التسوية',
      cancel: 'إلغاء',
      statuses: {
        PENDING: 'معلقة',
        PROCESSING: 'قيد المعالجة',
        COMPLETED: 'مكتملة',
        FAILED: 'فشلت',
      },
    },
    distributorMerchantsPage: {
      title: 'التجار',
      subtitle: 'إدارة حسابات التجار',
      addMerchant: '+ إضافة تاجر',
      empty: 'لا يوجد تجار بعد.',
      addFirst: 'أضف تاجرك الأول',
      colMerchant: 'التاجر',
      colStoreType: 'نوع المتجر',
      colStatus: 'الحالة',
      colBranches: 'الفروع',
      colUsers: 'المستخدمون',
      colOrders: 'الطلبات',
      colDeliveryCo: 'شركة التوصيل',
      colActions: 'إجراءات',
      manage: 'إدارة',
      none: '— بدون —',
      suspend: 'إيقاف',
      activate: 'تفعيل',
      approve: 'موافقة',
      reactivate: 'إعادة تفعيل',
      confirmSuspend: 'إيقاف هذا التاجر؟ سيتوقف متجره عن استقبال الطلبات.',
      storeTypes: {
        FOOD_MENU: 'قائمة طعام',
        ONLINE_STORE: 'متجر إلكتروني',
        SERVICES: 'خدمات',
        BOOKING: 'حجوزات',
        OTHER: 'أخرى',
      },
      statuses: {
        ACTIVE: 'نشط',
        PENDING: 'معلق',
        SUSPENDED: 'موقوف',
        CLOSED: 'مغلق',
      },
    },
    distributorMerchantDetailPage: {
      breadcrumb: 'التجار',
      branchesTitle: '🏠 الفروع',
      noBranches: 'لا توجد فروع',
      main: 'رئيسي',
      inactive: 'غير نشط',
      usersTitle: '👤 المستخدمون',
      noUsers: 'لا يوجد مستخدمون',
      owner: 'مالك',
      deliveryCompanyTitle: '🚚 شركة التوصيل',
      deliveryCompanyDesc: 'شركة التوصيل الافتراضية لطلبات هذا التاجر',
      noneOption: '— بدون —',
    },
    distributorNewMerchantPage: {
      title: 'إضافة تاجر',
      subtitle: 'أدخل البيانات الأساسية — سنرسل له رابطاً عبر واتساب لإكمال تسجيله بنفسه.',
      storeNameLabel: 'اسم المتجر',
      storeNamePlaceholder: 'مثال: مطعم الشيف',
      phoneLabel: 'رقم الهاتف (واتساب)',
      phonePlaceholder: '+249 9X XXX XXXX',
      locationLabel: 'الموقع',
      locationPlaceholder: 'مثال: الخرطوم، السوق العربي',
      cancel: 'إلغاء',
      sending: 'جاري إرسال الدعوة...',
      submit: 'إرسال رابط التسجيل',
      sentTitle: 'تم إرسال الدعوة',
      sentDescPrefix: 'تم إرسال رابط تسجيل إلى',
      sentDescSuffix: 'عبر واتساب. يمكن للتاجر استخدامه لإكمال إعداد متجره وتأكيد حسابه.',
      backToMerchants: 'العودة إلى التجار',
      genericError: 'حدث خطأ ما',
    },
    distributorOrdersPage: {
      title: 'الطلبيات',
      subtitle: 'كل الطلبات عبر جميع التجار التابعين لك',
      tabActive: 'الطلبيات النشطة',
      tabArchived: 'الطلبيات المؤرشفة',
      tabAll: 'كل الطلبيات',
      searchPlaceholder: 'بحث بالتسلسل أو اسم المستلم أو الهاتف',
      search: 'بحث',
      empty: 'لا توجد طلبيات',
      colOrderNumber: 'التسلسل',
      colSender: 'المرسل (التاجر)',
      colRecipient: 'اسم المستلم',
      colStatus: 'الحالة',
      colDeliveryCompany: 'شركة التوصيل',
      colAmount: 'المبلغ',
      ownDriversOption: '— مع سائقينا —',
      statuses: {
        NEW: 'جديد',
        ACCEPTED: 'مقبول',
        PREPARING: 'يُحضّر',
        READY: 'جاهز',
        OUT_FOR_DELIVERY: 'في الطريق',
        DELIVERED: 'تم التوصيل',
        CANCELLED: 'ملغي',
        REJECTED: 'مرفوض',
      },
    },
    distributorUsersPage: {
      title: 'المستخدمون',
      subtitle: 'إدارة موظفي حساب الموزع وصلاحياتهم',
      inviteUser: '+ دعوة مستخدم',
      cancel: 'إلغاء',
      invitedMessage: 'تمت دعوة {email} — تم إرسال رابط تعيين كلمة المرور له',
      inviteTitle: 'دعوة مستخدم جديد',
      emailLabel: 'البريد الإلكتروني *',
      roleLabel: 'الصلاحية',
      isOwnerLabel: 'مالك الحساب',
      sending: 'جاري الإرسال...',
      sendInvite: 'إرسال الدعوة',
      empty: 'لا يوجد مستخدمون بعد',
      colName: 'الاسم',
      colContact: 'البريد / الهاتف',
      colRole: 'الصلاحية',
      colOwner: 'هو المالك',
      colStatus: 'الحالة',
      colActions: 'إجراءات',
      you: '(أنت)',
      yes: 'نعم',
      no: 'لا',
      active: 'نشط',
      suspended: 'موقوف',
      deactivate: 'إيقاف',
      activate: 'تفعيل',
      cannotDeactivateSelf: 'لا يمكنك إيقاف حسابك الخاص',
      roles: {
        DISTRIBUTOR_OWNER: 'مالك',
        DISTRIBUTOR_ADMIN: 'مدير عام',
      },
    },
    orderDetailPage: {
      backToOrders: '← العودة للطلبات',
      orderNumberPrefix: 'طلب #',
      cancelOrder: 'إلغاء الطلب',
      rejectOrder: 'رفض الطلب',
      itemsTitle: 'الأصناف المطلوبة',
      unknownProduct: 'منتج',
      noteLabel: 'ملاحظة:',
      subtotal: 'المجموع الفرعي',
      deliveryFee: 'رسوم التوصيل',
      discount: 'الخصم',
      tax: 'الضريبة',
      total: 'الإجمالي',
      statusHistoryTitle: 'تاريخ الحالات',
      customerInfoTitle: 'معلومات العميل',
      deliveryPaymentTitle: 'التوصيل والدفع',
      deliveryMethodLabel: 'طريقة التوصيل',
      paymentMethodLabel: 'طريقة الدفع',
      branchLabel: 'الفرع',
      notesTitle: 'ملاحظات',
      customerNotePrefix: 'العميل:',
      internalNotePrefix: 'داخلية:',
      deliveryMethods: {
        PICKUP: 'استلام من الفرع',
        MERCHANT_DELIVERY: 'توصيل المطعم',
        WASLAK_DELIVERY: 'توصيل وصلك',
        EXTERNAL_DELIVERY: 'توصيل خارجي',
      },
      paymentMethods: {
        CASH: 'نقد عند الاستلام',
        CARD: 'بطاقة',
        ONLINE: 'دفع إلكتروني',
        WALLET: 'محفظة',
      },
    },
    statusTabsAll: 'الكل',
    productFormPage: {
      addTitle: 'إضافة منتج',
      addSubtitle: 'سيظهر المنتج الجديد للعملاء بمجرد تفعيله.',
      editTitle: 'تعديل المنتج',
      genericError: 'حدث خطأ ما',
      nameLabel: 'اسم المنتج',
      namePlaceholder: 'مثال: شاورما دجاج',
      descriptionLabel: 'الوصف',
      descriptionPlaceholder: 'وصف اختياري...',
      categoryLabel: 'الفئة',
      selectCategoryPlaceholder: 'اختر فئة…',
      priceLabel: 'السعر (SDG)',
      comparePriceLabel: 'سعر المقارنة',
      comparePricePlaceholder: 'اختياري',
      skuLabel: 'SKU',
      skuPlaceholder: 'رمز تعريف المخزون (اختياري)',
      activeToggleLabel: 'نشط (يظهر للعملاء)',
      featuredToggleLabel: 'مميز',
      cancel: 'إلغاء',
      saving: 'جاري الحفظ…',
      saveChanges: 'حفظ التغييرات',
      createProduct: 'إنشاء المنتج',
      searchPlaceholder: 'بحث عن منتجات...',
      filterAllStatus: 'كل الحالات',
      filterActive: 'نشط',
      filterInactive: 'غير نشط',
    },
  },
};
