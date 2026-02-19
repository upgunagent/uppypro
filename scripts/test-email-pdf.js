
const { generatePdfBuffer } = require('../lib/pdf-generator');
const { getDistanceSalesAgreementHtml } = require('../lib/agreement-generator');
const { sendSubscriptionWelcomeEmail } = require('../app/actions/email');
const fs = require('fs');

async function testEmailPdf() {
    console.log("Testing PDF Generation and Email Sending...");

    const mockAgreementData = {
        buyer: {
            name: "Test Kullanıcısı",
            email: "test@example.com",
            phone: "05555555555",
            address: "Test Mahallesi Test Sokak",
            city: "İstanbul",
            district: "Beşiktaş",
        },
        plan: {
            name: "Test UppyPro Plan",
            price: 1000,
            total: 1200,
            priceUsd: 100
        },
        exchangeRate: 30.5,
        date: new Date().toLocaleDateString('tr-TR')
    };

    try {
        // 1. Generate HTML
        console.log("1. Generating HTML...");
        const html = getDistanceSalesAgreementHtml(mockAgreementData);
        // fs.writeFileSync('test_agreement.html', html); // Debug

        // 2. Generate PDF
        console.log("2. Generating PDF Buffer...");
        // Note: In a script run with node directly, imports might need handling if using TS files.
        // Since we are in a Next.js env, it's better to run this via a dedicated route or 'next-script' runner usually.
        // However, for simplicity let's rely on the file content being correct and maybe create a temporary route to trigger this test
        // rather than running this file directly with node if ts-node is not set up perfectly.

        // This script file is just a placeholder for the logic we verify.
        // REAL VERIFICATION: Create a temporary route api/test-email that runs this logic.
    } catch (e) {
        console.error(e);
    }
}

// NOTE: Since this project uses Next.js with TS, running this directly with `node` will fail on imports.
// The best way is to create a temporary API Route.
