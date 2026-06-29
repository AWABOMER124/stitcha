/**
 * Customers Module — Public API
 */

export {
  getCustomersAction,
  getCustomerAction,
  createCustomerAction,
  updateCustomerAction,
  addCustomerAddressAction,
} from './actions';

export {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addAddress,
  getAddresses,
} from './services/customers.service';

export {
  createCustomerSchema,
  updateCustomerSchema,
  createAddressSchema,
  customerFilterSchema,
} from './schemas/customers.schemas';

export type { CustomerWithStats, CustomerFull } from './types';
export type { CreateCustomerInput, UpdateCustomerInput, CreateAddressInput } from './schemas/customers.schemas';
