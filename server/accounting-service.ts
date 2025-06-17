import { db } from './db';
import {
  accounts,
  accountTypes,
  journalEntries,
  journalEntryLines,
  journals,
  fiscalPeriods,
  autoJournalTemplates,
  posSales,
  companies,
  type Account,
  type JournalEntry,
  type JournalEntryLine,
  type AutoJournalTemplate,
  type POSSale,
} from '@shared/schema';
import { eq, and, desc, sum, sql, gte, lte } from 'drizzle-orm';

export class AccountingService {
  // Initialize default chart of accounts for a company
  async initializeChartOfAccounts(companyId: number, userId: string) {
    // Create default account types
    const defaultAccountTypes = [
      { code: 'ACTIVO', name: 'Activo', normalBalance: 'DEBIT', description: 'Activos de la empresa' },
      { code: 'PASIVO', name: 'Pasivo', normalBalance: 'CREDIT', description: 'Pasivos de la empresa' },
      { code: 'PATRIMONIO', name: 'Patrimonio', normalBalance: 'CREDIT', description: 'Patrimonio de la empresa' },
      { code: 'INGRESOS', name: 'Ingresos', normalBalance: 'CREDIT', description: 'Ingresos de la empresa' },
      { code: 'GASTOS', name: 'Gastos', normalBalance: 'DEBIT', description: 'Gastos de la empresa' },
    ];

    // Insert account types if they don't exist
    for (const accountType of defaultAccountTypes) {
      await db.insert(accountTypes)
        .values(accountType)
        .onConflictDoNothing();
    }

    // Get account types for reference
    const accountTypesData = await db.select().from(accountTypes);
    const activoType = accountTypesData.find(at => at.code === 'ACTIVO')!;
    const pasivoType = accountTypesData.find(at => at.code === 'PASIVO')!;
    const patrimonioType = accountTypesData.find(at => at.code === 'PATRIMONIO')!;
    const ingresosType = accountTypesData.find(at => at.code === 'INGRESOS')!;
    const gastosType = accountTypesData.find(at => at.code === 'GASTOS')!;

    // Create default chart of accounts structure
    const defaultAccounts = [
      // ACTIVOS
      { code: '1', name: 'ACTIVOS', accountTypeId: activoType.id, level: 1, isParent: true, allowTransactions: false },
      { code: '1.1', name: 'ACTIVOS CORRIENTES', accountTypeId: activoType.id, level: 2, isParent: true, allowTransactions: false },
      { code: '1.1.1', name: 'Efectivo y Equivalentes', accountTypeId: activoType.id, level: 3, isParent: true, allowTransactions: false },
      { code: '1.1.1.01', name: 'Caja General', accountTypeId: activoType.id, level: 4, allowTransactions: true },
      { code: '1.1.1.02', name: 'Caja Chica', accountTypeId: activoType.id, level: 4, allowTransactions: true },
      { code: '1.1.1.03', name: 'Banco - Cuenta Corriente', accountTypeId: activoType.id, level: 4, allowTransactions: true },
      { code: '1.1.2', name: 'Cuentas por Cobrar', accountTypeId: activoType.id, level: 3, isParent: true, allowTransactions: false },
      { code: '1.1.2.01', name: 'Clientes', accountTypeId: activoType.id, level: 4, allowTransactions: true },
      { code: '1.1.3', name: 'Inventarios', accountTypeId: activoType.id, level: 3, isParent: true, allowTransactions: false },
      { code: '1.1.3.01', name: 'Inventario de Mercancías', accountTypeId: activoType.id, level: 4, allowTransactions: true },

      // PASIVOS
      { code: '2', name: 'PASIVOS', accountTypeId: pasivoType.id, level: 1, isParent: true, allowTransactions: false },
      { code: '2.1', name: 'PASIVOS CORRIENTES', accountTypeId: pasivoType.id, level: 2, isParent: true, allowTransactions: false },
      { code: '2.1.1', name: 'Cuentas por Pagar', accountTypeId: pasivoType.id, level: 3, isParent: true, allowTransactions: false },
      { code: '2.1.1.01', name: 'Proveedores', accountTypeId: pasivoType.id, level: 4, allowTransactions: true },
      { code: '2.1.2', name: 'Impuestos por Pagar', accountTypeId: pasivoType.id, level: 3, isParent: true, allowTransactions: false },
      { code: '2.1.2.01', name: 'ITBIS por Pagar', accountTypeId: pasivoType.id, level: 4, allowTransactions: true },

      // PATRIMONIO
      { code: '3', name: 'PATRIMONIO', accountTypeId: patrimonioType.id, level: 1, isParent: true, allowTransactions: false },
      { code: '3.1', name: 'Capital Social', accountTypeId: patrimonioType.id, level: 2, allowTransactions: true },
      { code: '3.2', name: 'Utilidades Retenidas', accountTypeId: patrimonioType.id, level: 2, allowTransactions: true },

      // INGRESOS
      { code: '4', name: 'INGRESOS', accountTypeId: ingresosType.id, level: 1, isParent: true, allowTransactions: false },
      { code: '4.1', name: 'Ingresos por Ventas', accountTypeId: ingresosType.id, level: 2, allowTransactions: true },
      { code: '4.2', name: 'Otros Ingresos', accountTypeId: ingresosType.id, level: 2, allowTransactions: true },

      // GASTOS
      { code: '5', name: 'GASTOS', accountTypeId: gastosType.id, level: 1, isParent: true, allowTransactions: false },
      { code: '5.1', name: 'Costo de Ventas', accountTypeId: gastosType.id, level: 2, allowTransactions: true },
      { code: '5.2', name: 'Gastos Operativos', accountTypeId: gastosType.id, level: 2, isParent: true, allowTransactions: false },
      { code: '5.2.1', name: 'Gastos Administrativos', accountTypeId: gastosType.id, level: 3, allowTransactions: true },
      { code: '5.2.2', name: 'Gastos de Ventas', accountTypeId: gastosType.id, level: 3, allowTransactions: true },
    ];

    // Insert accounts with parent-child relationships
    const accountMap = new Map<string, number>();
    
    for (const account of defaultAccounts) {
      const parentCode = account.code.includes('.') 
        ? account.code.substring(0, account.code.lastIndexOf('.'))
        : null;
      
      const parentAccountId = parentCode ? accountMap.get(parentCode) : null;
      
      const [insertedAccount] = await db.insert(accounts)
        .values({
          ...account,
          companyId,
          parentAccountId,
        })
        .returning({ id: accounts.id });
      
      accountMap.set(account.code, insertedAccount.id);
    }

    // Create default journal
    await db.insert(journals).values({
      companyId,
      name: 'Diario General',
      code: 'GJ',
      description: 'Diario general de transacciones',
    });

    // Create default fiscal period (current year)
    const currentYear = new Date().getFullYear();
    await db.insert(fiscalPeriods).values({
      companyId,
      name: `Período Fiscal ${currentYear}`,
      startDate: new Date(`${currentYear}-01-01`),
      endDate: new Date(`${currentYear}-12-31`),
    });

    // Create auto journal templates for POS integration
    await this.createPOSAutoJournalTemplates(companyId, userId, accountMap);

    return { success: true, message: 'Chart of accounts initialized successfully' };
  }

  // Create automatic journal entry templates for POS transactions
  private async createPOSAutoJournalTemplates(companyId: number, userId: string, accountMap: Map<string, number>) {
    const templates = [
      {
        name: 'Venta POS - Efectivo',
        triggerEvent: 'pos_sale_cash',
        description: 'Asiento automático para ventas en efectivo del POS',
        template: {
          lines: [
            {
              accountCode: '1.1.1.01', // Caja General
              type: 'debit',
              amount: '${total}',
              description: 'Venta en efectivo POS #${saleNumber}'
            },
            {
              accountCode: '4.1', // Ingresos por Ventas
              type: 'credit',
              amount: '${subtotal}',
              description: 'Venta POS #${saleNumber}'
            },
            {
              accountCode: '2.1.2.01', // ITBIS por Pagar
              type: 'credit',
              amount: '${itbis}',
              description: 'ITBIS venta POS #${saleNumber}'
            }
          ]
        }
      },
      {
        name: 'Venta POS - Tarjeta',
        triggerEvent: 'pos_sale_card',
        description: 'Asiento automático para ventas con tarjeta del POS',
        template: {
          lines: [
            {
              accountCode: '1.1.1.03', // Banco - Cuenta Corriente
              type: 'debit',
              amount: '${total}',
              description: 'Venta con tarjeta POS #${saleNumber}'
            },
            {
              accountCode: '4.1', // Ingresos por Ventas
              type: 'credit',
              amount: '${subtotal}',
              description: 'Venta POS #${saleNumber}'
            },
            {
              accountCode: '2.1.2.01', // ITBIS por Pagar
              type: 'credit',
              amount: '${itbis}',
              description: 'ITBIS venta POS #${saleNumber}'
            }
          ]
        }
      }
    ];

    for (const template of templates) {
      await db.insert(autoJournalTemplates).values({
        companyId,
        name: template.name,
        triggerEvent: template.triggerEvent,
        description: template.description,
        template: template.template,
        createdBy: userId,
      });
    }
  }

  // Generate automatic journal entry for POS sale
  async generatePOSJournalEntry(saleId: number, companyId: number, userId: string) {
    // Get sale details
    const sale = await db.select()
      .from(posSales)
      .where(eq(posSales.id, saleId))
      .limit(1);

    if (!sale.length) {
      throw new Error('Sale not found');
    }

    const saleData = sale[0];
    const paymentMethod = saleData.paymentMethod === 'cash' ? 'pos_sale_cash' : 'pos_sale_card';

    // Get the appropriate template
    const template = await db.select()
      .from(autoJournalTemplates)
      .where(
        and(
          eq(autoJournalTemplates.companyId, companyId),
          eq(autoJournalTemplates.triggerEvent, paymentMethod),
          eq(autoJournalTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template.length) {
      throw new Error('No journal template found for this transaction type');
    }

    const templateData = template[0];
    const templateConfig = templateData.template as any;

    // Get the general journal
    const journal = await db.select()
      .from(journals)
      .where(
        and(
          eq(journals.companyId, companyId),
          eq(journals.code, 'GJ')
        )
      )
      .limit(1);

    if (!journal.length) {
      throw new Error('General journal not found');
    }

    // Generate entry number
    const entryCount = await db.select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(eq(journalEntries.companyId, companyId));

    const entryNumber = `GJ-${String(entryCount[0].count + 1).padStart(6, '0')}`;

    // Calculate amounts
    const subtotal = parseFloat(saleData.subtotal);
    const itbis = parseFloat(saleData.itbis);
    const total = parseFloat(saleData.total);

    // Create journal entry
    const [journalEntry] = await db.insert(journalEntries)
      .values({
        companyId,
        journalId: journal[0].id,
        entryNumber,
        reference: `POS-${saleData.saleNumber}`,
        description: `Venta POS #${saleData.saleNumber} - ${saleData.paymentMethod}`,
        entryDate: new Date(saleData.saleDate),
        totalDebit: total.toFixed(2),
        totalCredit: total.toFixed(2),
        isBalanced: true,
        status: 'posted',
        sourceModule: 'POS',
        sourceId: saleId,
        createdBy: userId,
        postedBy: userId,
        postedAt: new Date(),
      })
      .returning({ id: journalEntries.id });

    // Create journal entry lines based on template
    const lines = templateConfig.lines;
    let lineNumber = 1;

    for (const line of lines) {
      // Get account by code
      const account = await db.select()
        .from(accounts)
        .where(
          and(
            eq(accounts.companyId, companyId),
            eq(accounts.code, line.accountCode)
          )
        )
        .limit(1);

      if (!account.length) {
        console.warn(`Account ${line.accountCode} not found, skipping line`);
        continue;
      }

      // Calculate amount based on template variables
      let amount = 0;
      if (line.amount === '${total}') amount = total;
      else if (line.amount === '${subtotal}') amount = subtotal;
      else if (line.amount === '${itbis}') amount = itbis;
      else amount = parseFloat(line.amount);

      // Create journal entry line
      await db.insert(journalEntryLines).values({
        journalEntryId: journalEntry.id,
        accountId: account[0].id,
        description: line.description
          .replace('${saleNumber}', saleData.saleNumber),
        debitAmount: line.type === 'debit' ? amount.toFixed(2) : '0.00',
        creditAmount: line.type === 'credit' ? amount.toFixed(2) : '0.00',
        lineNumber,
      });

      // Update account balance
      const currentBalance = parseFloat(account[0].currentBalance);
      const newBalance = line.type === 'debit' 
        ? currentBalance + amount 
        : currentBalance - amount;

      await db.update(accounts)
        .set({ currentBalance: newBalance.toFixed(2) })
        .where(eq(accounts.id, account[0].id));

      lineNumber++;
    }

    return {
      success: true,
      journalEntryId: journalEntry.id,
      entryNumber,
      message: 'Journal entry created successfully'
    };
  }

  // Generate Trial Balance report
  async generateTrialBalance(companyId: number, asOfDate?: Date) {
    const endDate = asOfDate || new Date();
    
    const trialBalance = await db.select({
      accountId: accounts.id,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accountTypes.name,
      normalBalance: accountTypes.normalBalance,
      debitTotal: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntryLines.debitAmount} > 0 THEN ${journalEntryLines.debitAmount} ELSE 0 END), 0)`,
      creditTotal: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntryLines.creditAmount} > 0 THEN ${journalEntryLines.creditAmount} ELSE 0 END), 0)`,
    })
    .from(accounts)
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(journalEntryLines, eq(accounts.id, journalEntryLines.accountId))
    .leftJoin(journalEntries, and(
      eq(journalEntryLines.journalEntryId, journalEntries.id),
      eq(journalEntries.status, 'posted'),
      lte(journalEntries.entryDate, endDate)
    ))
    .where(
      and(
        eq(accounts.companyId, companyId),
        eq(accounts.allowTransactions, true)
      )
    )
    .groupBy(accounts.id, accounts.code, accounts.name, accountTypes.name, accountTypes.normalBalance)
    .orderBy(accounts.code);

    // Calculate balances based on normal balance
    const processedData = trialBalance.map(account => {
      const debit = parseFloat(account.debitTotal?.toString() || '0');
      const credit = parseFloat(account.creditTotal?.toString() || '0');
      const balance = account.normalBalance === 'DEBIT' ? debit - credit : credit - debit;
      
      return {
        ...account,
        debitBalance: balance > 0 && account.normalBalance === 'DEBIT' ? balance : 0,
        creditBalance: balance > 0 && account.normalBalance === 'CREDIT' ? balance : 0,
        balance: Math.abs(balance),
      };
    });

    const totalDebits = processedData.reduce((sum, acc) => sum + acc.debitBalance, 0);
    const totalCredits = processedData.reduce((sum, acc) => sum + acc.creditBalance, 0);

    return {
      accounts: processedData,
      totals: {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
      },
      asOfDate: endDate
    };
  }

  // Generate Income Statement
  async generateIncomeStatement(companyId: number, startDate: Date, endDate: Date) {
    const incomeStatementData = await db.select({
      accountId: accounts.id,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accountTypes.name,
      amount: sql<number>`COALESCE(SUM(${journalEntryLines.creditAmount} - ${journalEntryLines.debitAmount}), 0)`,
    })
    .from(accounts)
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(journalEntryLines, eq(accounts.id, journalEntryLines.accountId))
    .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(accounts.companyId, companyId),
        sql`${accountTypes.code} IN ('INGRESOS', 'GASTOS')`,
        isNotNull(journalEntries.id),
        eq(journalEntries.status, 'posted'),
        sql`${journalEntries.date} >= ${startDate}`,
        sql`${journalEntries.date} <= ${endDate}`
      )
    )
    .groupBy(accounts.id, accounts.code, accounts.name, accountTypes.name)
    .orderBy(accounts.code);

    const revenues = incomeStatementData.filter(acc => acc.accountType === 'Ingresos');
    const expenses = incomeStatementData.filter(acc => acc.accountType === 'Gastos');

    const totalRevenues = revenues.reduce((sum, acc) => sum + parseFloat(acc.amount?.toString() || '0'), 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + parseFloat(acc.amount?.toString() || '0'), 0);
    const netIncome = totalRevenues - totalExpenses;

    return {
      revenues,
      expenses,
      totals: {
        totalRevenues,
        totalExpenses,
        netIncome
      },
      period: { startDate, endDate }
    };
  }

  // Generate Balance Sheet
  async generateBalanceSheet(companyId: number, asOfDate?: Date) {
    const endDate = asOfDate || new Date();
    
    const balanceSheetData = await db.select({
      accountId: accounts.id,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accountTypes.name,
      normalBalance: accountTypes.normalBalance,
      balance: sql<number>`COALESCE(${accounts.currentBalance}, 0)`,
    })
    .from(accounts)
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .where(
      and(
        eq(accounts.companyId, companyId),
        sql`${accountTypes.code} IN ('ACTIVO', 'PASIVO', 'PATRIMONIO')`,
        eq(accounts.allowTransactions, true)
      )
    )
    .orderBy(accounts.code);

    const assets = balanceSheetData.filter(acc => acc.accountType === 'Activo');
    const liabilities = balanceSheetData.filter(acc => acc.accountType === 'Pasivo');
    const equity = balanceSheetData.filter(acc => acc.accountType === 'Patrimonio');

    const totalAssets = assets.reduce((sum, acc) => sum + parseFloat(acc.balance?.toString() || '0'), 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + parseFloat(acc.balance?.toString() || '0'), 0);
    const totalEquity = equity.reduce((sum, acc) => sum + parseFloat(acc.balance?.toString() || '0'), 0);

    return {
      assets,
      liabilities,
      equity,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      },
      asOfDate: endDate
    };
  }

  // Get General Ledger for specific account
  async getGeneralLedger(companyId: number, accountId: number, startDate?: Date, endDate?: Date) {
    let query = db.select({
      entryDate: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      reference: journalEntries.reference,
      description: journalEntryLines.description,
      debitAmount: journalEntryLines.debitAmount,
      creditAmount: journalEntryLines.creditAmount,
    })
    .from(journalEntryLines)
    .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalEntryLines.accountId, accountId),
        eq(journalEntries.companyId, companyId),
        eq(journalEntries.status, 'posted')
      )
    );

    if (startDate) {
      query = query.where(gte(journalEntries.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(journalEntries.date, endDate));
    }

    const transactions = await query.orderBy(journalEntries.date, journalEntries.entryNumber);

    // Calculate running balance
    let runningBalance = 0;
    const ledgerEntries = transactions.map(transaction => {
      const debit = parseFloat(transaction.debitAmount || '0');
      const credit = parseFloat(transaction.creditAmount || '0');
      runningBalance += debit - credit;
      
      return {
        ...transaction,
        runningBalance
      };
    });

    return ledgerEntries;
  }
}

export const accountingService = new AccountingService();