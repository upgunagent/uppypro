/**
 * Trendyol Marketplace API Client
 * RESTful API client for product, order, question, and return management.
 */

const TRENDYOL_BASE_URL = "https://apigw.trendyol.com";

export interface TrendyolCredentials {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}

export interface TrendyolProduct {
  id: string;
  productCode: number;
  contentId: number;
  barcode: string;
  title: string;
  description: string;
  brand: { id: number; name: string };
  categoryName: string;
  salePrice: number;
  listPrice: number;
  quantity: number;
  images: { url: string }[];
  attributes: { attributeName: string; attributeValue: string }[];
  approved: boolean;
  productMainId: string;
  productUrl?: string;
}

export interface TrendyolOrder {
  shipmentPackageId: number;
  orderNumber: string;
  orderDate: number;
  totalPrice: number;
  status: string;
  cargoProviderName: string;
  cargoTrackingNumber: string;
  cargoTrackingLink: string;
  lines: {
    productName: string;
    quantity: number;
    amount: number;
    barcode: string;
  }[];
  shipmentAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    district: string;
  };
  estimatedDeliveryStartDate?: number;
  estimatedDeliveryEndDate?: number;
}

export interface TrendyolQuestion {
  id: number;
  text: string;
  creationDate: number;
  status: string;
  productName: string;
  productMainId: string;
  answer?: {
    text: string;
    creationDate: number;
  };
}

function getAuthHeader(creds: TrendyolCredentials): string {
  const token = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  return `Basic ${token}`;
}

async function trendyolFetch(
  creds: TrendyolCredentials,
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${TRENDYOL_BASE_URL}${path}`;
  const method = options.method || "GET";

  const headers: Record<string, string> = {
    Authorization: getAuthHeader(creds),
    "User-Agent": `${creds.supplierId} - SelfIntegration`,
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Content-Type sadece POST/PUT isteklerinde gönder
  if (method === "POST" || method === "PUT") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    method,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    
    // Cloudflare WAF block kontrolü
    if (res.status === 403 && (errorBody.includes("Cloudflare") || errorBody.includes("cf-error"))) {
      throw new Error(
        "Trendyol API güvenlik duvarı (Cloudflare) isteği engelledi. " +
        "Bu genellikle sunucu IP adresi henüz Trendyol tarafından tanınmadığında olur. " +
        "API bilgilerinizin doğru olduğundan emin olun ve birkaç dakika sonra tekrar deneyin."
      );
    }
    
    // Kısa ve anlaşılır hata mesajı
    if (res.status === 401) {
      throw new Error("API Key veya API Secret hatalı. Lütfen bilgilerinizi kontrol edin.");
    }
    if (res.status === 404) {
      throw new Error("Supplier ID bulunamadı. Lütfen Satıcı ID'nizi kontrol edin.");
    }
    
    throw new Error(`Trendyol API hatası (${res.status}). Lütfen bilgilerinizi kontrol edin.`);
  }

  return res.json();
}

/**
 * API bağlantısını test eder. Başarılıysa mağaza bilgilerini döndürür.
 */
export async function testConnection(creds: TrendyolCredentials): Promise<{
  success: boolean;
  totalProducts?: number;
  error?: string;
}> {
  try {
    const data = await trendyolFetch(
      creds,
      `/integration/product/sellers/${creds.supplierId}/products?size=1&page=0`
    );
    return {
      success: true,
      totalProducts: data.totalElements || 0,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Tüm ürünleri sayfalanarak çeker.
 * onProgress callback ile ilerleme bildirimi yapılabilir.
 */
export async function fetchAllProducts(
  creds: TrendyolCredentials,
  onProgress?: (fetched: number, total: number) => void
): Promise<TrendyolProduct[]> {
  const allProducts: TrendyolProduct[] = [];
  const pageSize = 50;
  let page = 0;
  let totalElements = 0;

  do {
    const data = await trendyolFetch(
      creds,
      `/integration/product/sellers/${creds.supplierId}/products?size=${pageSize}&page=${page}`
    );

    totalElements = data.totalElements || 0;
    const products = data.content || [];
    
    // Debug: ilk ürünün tüm alanlarını logla (URL yapısını anlamak için)
    if (page === 0 && products.length > 0) {
      const sample = products[0];
      console.log("[Trendyol] Sample product keys:", Object.keys(sample));
      console.log("[Trendyol] Sample product URL fields:", {
        id: sample.id,
        productCode: sample.productCode,
        contentId: sample.contentId,
        productContentId: (sample as any).productContentId,
        productUrl: sample.productUrl,
        productPageUrl: (sample as any).productPageUrl,
        pimCategoryId: (sample as any).pimCategoryId,
      });
    }
    
    allProducts.push(...products);

    if (onProgress) {
      onProgress(allProducts.length, totalElements);
    }

    page++;

    // Rate limit koruması
    if (products.length === pageSize) {
      await new Promise((r) => setTimeout(r, 200));
    }
  } while (allProducts.length < totalElements);

  return allProducts;
}

/**
 * Son güncellenen ürünleri çeker (incremental sync)
 */
export async function fetchUpdatedProducts(
  creds: TrendyolCredentials,
  sinceTimestamp: number
): Promise<TrendyolProduct[]> {
  const allProducts: TrendyolProduct[] = [];
  const pageSize = 50;
  let page = 0;
  let totalElements = 0;

  do {
    const data = await trendyolFetch(
      creds,
      `/integration/product/sellers/${creds.supplierId}/products?size=${pageSize}&page=${page}&lastUpdateDate=${sinceTimestamp}`
    );

    totalElements = data.totalElements || 0;
    const products = data.content || [];
    allProducts.push(...products);
    page++;

    if (products.length === pageSize) {
      await new Promise((r) => setTimeout(r, 200));
    }
  } while (allProducts.length < totalElements);

  return allProducts;
}

/**
 * Sipariş paketlerini çeker
 */
export async function getShipmentPackages(
  creds: TrendyolCredentials,
  params: {
    orderNumber?: string;
    startDate?: number;
    endDate?: number;
    status?: string;
    page?: number;
    size?: number;
  } = {}
): Promise<{ content: TrendyolOrder[]; totalElements: number }> {
  const queryParams = new URLSearchParams();
  if (params.orderNumber) queryParams.set("orderNumber", params.orderNumber);
  if (params.startDate) queryParams.set("startDate", String(params.startDate));
  if (params.endDate) queryParams.set("endDate", String(params.endDate));
  if (params.status) queryParams.set("status", params.status);
  queryParams.set("page", String(params.page || 0));
  queryParams.set("size", String(params.size || 20));

  const data = await trendyolFetch(
    creds,
    `/integration/order/sellers/${creds.supplierId}/orders?${queryParams.toString()}`
  );

  return {
    content: data.content || [],
    totalElements: data.totalElements || 0,
  };
}

/**
 * Cevaplanmamış müşteri sorularını çeker
 */
export async function getUnansweredQuestions(
  creds: TrendyolCredentials,
  page = 0,
  size = 20
): Promise<{ content: TrendyolQuestion[]; totalElements: number }> {
  const data = await trendyolFetch(
    creds,
    `/integration/qna/sellers/${creds.supplierId}/questions/filter?status=WAITING_FOR_ANSWER&page=${page}&size=${size}`
  );

  return {
    content: data.content || [],
    totalElements: data.totalElements || 0,
  };
}

/**
 * Müşteri sorusunu cevaplar
 */
export async function answerQuestion(
  creds: TrendyolCredentials,
  questionId: number,
  answerText: string
): Promise<void> {
  await trendyolFetch(
    creds,
    `/integration/qna/sellers/${creds.supplierId}/questions/${questionId}/answers`,
    {
      method: "POST",
      body: JSON.stringify({ text: answerText }),
    }
  );
}

/**
 * İade talebi oluşturur
 */
export async function createClaim(
  creds: TrendyolCredentials,
  params: {
    shipmentPackageId: number;
    items: { orderLineId: number; quantity: number }[];
    reason: string;
  }
): Promise<any> {
  return trendyolFetch(
    creds,
    `/integration/order/sellers/${creds.supplierId}/claims`,
    {
      method: "POST",
      body: JSON.stringify({
        shipmentPackageId: params.shipmentPackageId,
        items: params.items,
        claimReason: params.reason,
      }),
    }
  );
}

/**
 * Ürün URL'sini oluşturur
 * Gerçek Trendyol URL formatı: trendyol.com/{brand-slug}/{title-slug}-p-{contentId}?boutiqueId=61&merchantId={supplierId}
 */
export function buildProductUrl(
  contentId: number,
  brand?: string,
  title?: string,
  supplierId?: string
): string {
  const slug = (title || "urun")
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşüü\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 80);
  const brandSlug = (brand || "marka")
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşüü\s-]/g, "")
    .replace(/\s+/g, "-");

  let url = `https://www.trendyol.com/${brandSlug}/${slug}-p-${contentId}`;
  if (supplierId) {
    url += `?boutiqueId=61&merchantId=${supplierId}`;
  }
  return url;
}
