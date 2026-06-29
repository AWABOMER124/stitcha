/** Dashboard sidebar navigation config */
export const dashboardNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: null },
  { label: 'Orders', href: '/dashboard/orders', icon: 'ShoppingBag', permission: 'orders:read' },
  { label: 'Products', href: '/dashboard/products', icon: 'Package', permission: 'products:read' },
  { label: 'Categories', href: '/dashboard/categories', icon: 'FolderOpen', permission: 'categories:read' },
  { label: 'Inventory', href: '/dashboard/inventory', icon: 'ClipboardList', permission: 'inventory:read' },
  { label: 'Customers', href: '/dashboard/customers', icon: 'Users', permission: 'customers:read' },
  { label: 'Branches', href: '/dashboard/branches', icon: 'Building2', permission: 'branches:read' },
  { label: 'Staff', href: '/dashboard/staff', icon: 'UserCog', permission: 'staff:read' },
  { label: 'Delivery', href: '/dashboard/delivery', icon: 'Truck', permission: 'delivery:read' },
  { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart3', permission: 'reports:view' },
  { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell', permission: 'notifications:read' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'Settings', permission: 'settings:read' },
] as const;
