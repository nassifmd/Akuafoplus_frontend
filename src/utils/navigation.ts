export type TradeStackParamList = {
  TradeScreen: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Wishlist: undefined;
  // Add other screens as needed
};

// If you're using Tab navigation as well
export type RootStackParamList = {
  Main: undefined;
  // Other stacks
};