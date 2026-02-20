import { NextResponse } from 'next/server';
import { initializeCardUpdate } from '@/app/actions/subscription';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await initializeCardUpdate();
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
