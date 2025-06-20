import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdatePaystackSubaccount } from '@/app/actions/createPaystackSubaccount';
import { getPaystackSubaccountStatus } from '@/app/actions/getPaystackSubaccountStatus';
import { getPaystackBankList } from '@/app/actions/getPaystackBankList';
import { verifyPaystackBankAccount } from '@/app/actions/verifyPaystackBankAccount';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        const status = await getPaystackSubaccountStatus();
        return NextResponse.json(status);
      
      case 'banks':
        const banks = await getPaystackBankList();
        return NextResponse.json(banks);
      
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Paystack subaccount GET API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'create':
        const { bankCode, accountNumber } = body;
        if (!bankCode || !accountNumber) {
          return NextResponse.json({ error: 'Bank code and account number are required' }, { status: 400 });
        }
        const result = await createOrUpdatePaystackSubaccount({ bankCode, accountNumber });
        return NextResponse.json(result);
      
      case 'verify':
        const { bankCode: verifyBankCode, accountNumber: verifyAccountNumber } = body;
        if (!verifyBankCode || !verifyAccountNumber) {
          return NextResponse.json({ error: 'Bank code and account number are required' }, { status: 400 });
        }
        const verificationResult = await verifyPaystackBankAccount({ 
          bankCode: verifyBankCode, 
          accountNumber: verifyAccountNumber 
        });
        return NextResponse.json(verificationResult);
      
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Paystack subaccount POST API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 