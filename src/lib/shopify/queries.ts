// ---------------------------------------------------------------------------
// Shopify Storefront API - GraphQL query strings
// ---------------------------------------------------------------------------

// ---- Fragments -------------------------------------------------------------

const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

const PRODUCT_FRAGMENT = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 20) {
      nodes {
        ...ImageFields
      }
    }
    variants(first: 50) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        storeAvailability(first: 5) {
          nodes {
            available
            pickUpTime
            location {
              id
              name
            }
          }
        }
      }
    }
    seo {
      title
      description
    }
  }
`;

// ---- Queries ---------------------------------------------------------------

export const GET_PRODUCTS_BY_COLLECTION = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${PRODUCT_FRAGMENT}
  query GetProductsByCollection(
    $handle: String!
    $first: Int = 250
    $sortKey: ProductCollectionSortKeys = BEST_SELLING
  ) {
    collection(handle: $handle) {
      handle
      title
      description
      image {
        ...ImageFields
      }
      seo {
        title
        description
      }
      products(first: $first, sortKey: $sortKey) {
        nodes {
          ...ProductFields
        }
      }
    }
  }
`;

export const GET_PRODUCT_BY_HANDLE = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${PRODUCT_FRAGMENT}
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductFields
    }
  }
`;

export const GET_COLLECTIONS = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  query GetCollections($first: Int = 20) {
    collections(first: $first) {
      nodes {
        handle
        title
        description
        image {
          ...ImageFields
        }
        seo {
          title
          description
        }
      }
    }
  }
`;

export const SEARCH_PRODUCTS = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${PRODUCT_FRAGMENT}
  query SearchProducts($query: String!, $first: Int = 20) {
    search(query: $query, first: $first, types: PRODUCT) {
      nodes {
        ... on Product {
          ...ProductFields
        }
      }
    }
  }
`;

export const GET_COLLECTION_PRODUCTS_PAGINATED = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${PRODUCT_FRAGMENT}
  query GetCollectionProductsPaginated(
    $handle: String!
    $first: Int = 250
    $after: String
    $sortKey: ProductCollectionSortKeys = BEST_SELLING
  ) {
    collection(handle: $handle) {
      handle
      title
      description
      image {
        ...ImageFields
      }
      seo {
        title
        description
      }
      products(first: $first, after: $after, sortKey: $sortKey) {
        nodes {
          ...ProductFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
