export type StoreData = {
  merchant: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    businessType: string;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    _count: { products: number };
  }>;
};
