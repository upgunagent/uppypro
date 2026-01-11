export async function getUsdRate(): Promise<number> {
    try {
        // TCMB daily exchange rates XML
        const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', { next: { revalidate: 3600 } }); // Cache for 1 hour
        const text = await res.text();

        // Simple regex parse to avoid heavy XML parsers
        // Looking for <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"> ... <ForexSelling>34.5678</ForexSelling>
        const match = text.match(/Code="USD"[\s\S]*?<ForexSelling>([0-9.]+)<\/ForexSelling>/);

        if (match && match[1]) {
            return parseFloat(match[1]);
        }

        console.error("Could not parse USD rate from TCMB");
        return 34.50; // Fallback safe rate
    } catch (e) {
        console.error("Failed to fetch TCMB rates", e);
        return 34.50; // Fallback
    }
}
