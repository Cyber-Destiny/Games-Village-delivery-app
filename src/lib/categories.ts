// Shared between server and client.

export type CategoryId = "food" | "groceries" | "gas" | "pickup" | "laundry" | "other";
export type OrderKind = "buy" | "pickup";

export type Category = {
  id: CategoryId;
  label: string;
  short: string;
  kind: OrderKind;
  blurb: string;
  hint: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "food",
    label: "Food",
    short: "Food",
    kind: "buy",
    blurb: "Hot meals from kitchens and spots in the estate",
    hint: "e.g. 2 plates of jollof rice with chicken",
  },
  {
    id: "groceries",
    label: "Groceries",
    short: "Groceries",
    kind: "buy",
    blurb: "Provisions, drinks, toiletries, bread",
    hint: "e.g. 1 loaf of bread, 2 tins of Peak milk",
  },
  {
    id: "gas",
    label: "Gas refill",
    short: "Gas",
    kind: "buy",
    blurb: "We collect your cylinder and bring it back full",
    hint: "e.g. 12.5kg cylinder, full refill",
  },
  {
    id: "pickup",
    label: "Pick up & drop",
    short: "Pickup",
    kind: "pickup",
    blurb: "Parcels at the gate, keys, documents",
    hint: "e.g. Jumia parcel with security at the main gate",
  },
  {
    id: "laundry",
    label: "Laundry",
    short: "Laundry",
    kind: "pickup",
    blurb: "Drop off or collect from the dry cleaner",
    hint: "e.g. Collect 2 bags of clothes from my house",
  },
  {
    id: "other",
    label: "Something else",
    short: "Other",
    kind: "buy",
    blurb: "Pharmacy, recharge cards, anything in the estate",
    hint: "Tell us exactly what you need",
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export function getCategory(id: string): Category {
  return CATEGORY_MAP[id as CategoryId] ?? CATEGORY_MAP.other;
}

export function isCategoryId(id: string): id is CategoryId {
  return id in CATEGORY_MAP;
}
