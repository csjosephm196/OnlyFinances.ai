// services/firestoreService.ts - Firestore CRUD operations for all collections

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
    arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    UserProfile,
    UserPreferences,
    ConversationDocument,
    ConversationWithId,
    MessageDocument,
    MessageWithId,
    BudgetHistoryDocument,
    BudgetHistoryWithId,
    TransactionDocument,
    BalanceSheetDocument,
    BalanceSheetWithId,
    BalanceSheetItemDocument,
    IncomeStatementDocument,
    IncomeStatementWithId,
    IncomeStatementItemDocument,
} from '../types/firestoreTypes';
import { ProcessingResult, CategorizedTransaction } from '../types/budget';
import { BalanceSheetData, BalanceSheetItem } from '../types/balanceSheet';
import { IncomeStatementData, IncomeStatementItem } from '../types/incomeStatement';

// ============================================
// User Profile Operations
// ============================================

export async function createUserProfile(
    userId: string,
    email: string,
    displayName: string | null = null,
    photoURL: string | null = null
): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userProfile: UserProfile = {
        email,
        displayName,
        photoURL,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        preferences: {
            theme: 'light',
            currency: 'USD',
            notifications: true,
        },
    };
    await setDoc(userRef, userProfile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
}

export async function updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        preferences,
        updatedAt: Timestamp.now(),
    });
}

// ============================================
// Conversation Operations
// ============================================

export async function createConversation(
    userId: string,
    title: string,
    sessionId: string | null = null
): Promise<string> {
    const conversationsRef = collection(db, 'conversations');
    const conversationData: ConversationDocument = {
        userId,
        title,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
        sessionId,
    };
    const docRef = await addDoc(conversationsRef, conversationData);
    return docRef.id;
}

export async function getConversations(
    userId: string,
    maxCount: number = 50
): Promise<ConversationWithId[]> {
    const conversationsRef = collection(db, 'conversations');
    // Note: Removed orderBy to avoid requiring composite index
    // Sorting is done client-side instead
    const q = query(
        conversationsRef,
        where('userId', '==', userId),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as ConversationWithId[];
    // Sort by updatedAt descending client-side
    return conversations.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

export async function updateConversation(
    conversationId: string,
    updates: Partial<Pick<ConversationDocument, 'title' | 'sessionId' | 'messageCount'>>
): Promise<void> {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteConversation(conversationId: string): Promise<void> {
    // Delete all messages in the conversation first
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete the conversation document
    const conversationRef = doc(db, 'conversations', conversationId);
    batch.delete(conversationRef);

    await batch.commit();
}

// ============================================
// Message Operations
// ============================================

export async function addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    isFinancial?: boolean,
    suggestions?: string[]
): Promise<string> {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageData: MessageDocument = {
        role,
        content,
        timestamp: Timestamp.now(),
        ...(isFinancial !== undefined && { isFinancial }),
        ...(suggestions && { suggestions }),
    };
    const docRef = await addDoc(messagesRef, messageData);

    // Update conversation message count
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
        const currentCount = conversationSnap.data().messageCount || 0;
        await updateDoc(conversationRef, {
            messageCount: currentCount + 1,
            updatedAt: Timestamp.now(),
        });
    }

    return docRef.id;
}

export async function getMessages(conversationId: string): Promise<MessageWithId[]> {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as MessageWithId[];
}

// ============================================
// Budget History Operations
// ============================================

export async function saveBudgetHistory(
    userId: string,
    fileName: string,
    result: ProcessingResult
): Promise<string> {
    const budgetRef = collection(db, 'budgetHistory');
    const budgetData: BudgetHistoryDocument = {
        userId,
        fileName,
        uploadedAt: Timestamp.now(),
        dateRange: result.date_range,
        totalTransactions: result.total_transactions,
        summary: result.summary,
        monthlyBreakdown: result.monthly_breakdown,
    };
    const docRef = await addDoc(budgetRef, budgetData);

    // Save transactions in subcollection (batch write for efficiency)
    if (result.transactions && result.transactions.length > 0) {
        const transactionsRef = collection(db, 'budgetHistory', docRef.id, 'transactions');
        const batch = writeBatch(db);

        result.transactions.forEach((transaction) => {
            const transactionDoc: TransactionDocument = {
                date: transaction.date,
                description: transaction.description,
                amount: transaction.amount,
                category: transaction.category,
                confidence: transaction.confidence,
                originalCategory: transaction.original_category,
            };
            const newDocRef = doc(transactionsRef);
            batch.set(newDocRef, transactionDoc);
        });

        await batch.commit();
    }

    return docRef.id;
}

export async function getBudgetHistory(
    userId: string,
    maxCount: number = 20
): Promise<BudgetHistoryWithId[]> {
    const budgetRef = collection(db, 'budgetHistory');
    // Note: Removed orderBy to avoid requiring composite index
    const q = query(
        budgetRef,
        where('userId', '==', userId),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    const budgets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as BudgetHistoryWithId[];
    // Sort by uploadedAt descending client-side
    return budgets.sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());
}

export async function getBudgetTransactions(
    budgetId: string
): Promise<CategorizedTransaction[]> {
    const transactionsRef = collection(db, 'budgetHistory', budgetId, 'transactions');
    const snapshot = await getDocs(transactionsRef);
    return snapshot.docs.map((doc) => {
        const data = doc.data() as TransactionDocument;
        return {
            date: data.date,
            description: data.description,
            amount: data.amount,
            category: data.category,
            confidence: data.confidence,
            original_category: data.originalCategory,
        };
    });
}

export async function deleteBudgetHistory(budgetId: string): Promise<void> {
    // Delete transactions subcollection first
    const transactionsRef = collection(db, 'budgetHistory', budgetId, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsRef);

    const batch = writeBatch(db);
    transactionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete the budget document
    const budgetRef = doc(db, 'budgetHistory', budgetId);
    batch.delete(budgetRef);

    await batch.commit();
}

/**
 * Get or create the master budget document for a user.
 * The master document consolidates all merged transaction data.
 */
async function getOrCreateMasterBudget(userId: string): Promise<string | null> {
    const budgetRef = collection(db, 'budgetHistory');
    const q = query(
        budgetRef,
        where('userId', '==', userId),
        where('isMerged', '==', true),
        limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length > 0) {
        return snapshot.docs[0].id;
    }
    return null;
}

/**
 * Merge budget history - updates existing master document or creates new one
 * with merged transaction data and tracking metadata.
 */
export async function mergeBudgetHistory(
    userId: string,
    fileName: string,
    mergedResult: ProcessingResult
): Promise<string> {
    const existingMasterId = await getOrCreateMasterBudget(userId);
    
    if (existingMasterId) {
        // Update existing master document
        const budgetRef = doc(db, 'budgetHistory', existingMasterId);
        
        await updateDoc(budgetRef, {
            uploadedAt: Timestamp.now(),
            dateRange: mergedResult.date_range,
            totalTransactions: mergedResult.total_transactions,
            summary: mergedResult.summary,
            monthlyBreakdown: mergedResult.monthly_breakdown,
            sourceFiles: arrayUnion(fileName),
            lastMergedAt: Timestamp.now(),
        });
        
        // Clear existing transactions and replace with merged set
        const transactionsRef = collection(db, 'budgetHistory', existingMasterId, 'transactions');
        const existingTransactions = await getDocs(transactionsRef);
        
        // Delete old transactions in batches
        const deleteBatch = writeBatch(db);
        existingTransactions.docs.forEach((docSnap) => {
            deleteBatch.delete(docSnap.ref);
        });
        await deleteBatch.commit();
        
        // Add merged transactions in batches (Firestore limit is 500 per batch)
        const batchSize = 450;
        for (let i = 0; i < mergedResult.transactions.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = mergedResult.transactions.slice(i, i + batchSize);
            
            chunk.forEach((transaction) => {
                const transactionDoc: TransactionDocument = {
                    date: transaction.date,
                    description: transaction.description,
                    amount: transaction.amount,
                    category: transaction.category,
                    confidence: transaction.confidence,
                    originalCategory: transaction.original_category,
                };
                const newDocRef = doc(transactionsRef);
                batch.set(newDocRef, transactionDoc);
            });
            
            await batch.commit();
        }
        
        return existingMasterId;
    } else {
        // Create new master document
        const budgetRef = collection(db, 'budgetHistory');
        const budgetData: BudgetHistoryDocument = {
            userId,
            fileName: `Merged: ${fileName}`,
            uploadedAt: Timestamp.now(),
            dateRange: mergedResult.date_range,
            totalTransactions: mergedResult.total_transactions,
            summary: mergedResult.summary,
            monthlyBreakdown: mergedResult.monthly_breakdown,
            sourceFiles: [fileName],
            isMerged: true,
            lastMergedAt: Timestamp.now(),
        };
        const docRef = await addDoc(budgetRef, budgetData);
        
        // Save transactions in batches
        const transactionsRef = collection(db, 'budgetHistory', docRef.id, 'transactions');
        const batchSize = 450;
        
        for (let i = 0; i < mergedResult.transactions.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = mergedResult.transactions.slice(i, i + batchSize);
            
            chunk.forEach((transaction) => {
                const transactionDoc: TransactionDocument = {
                    date: transaction.date,
                    description: transaction.description,
                    amount: transaction.amount,
                    category: transaction.category,
                    confidence: transaction.confidence,
                    originalCategory: transaction.original_category,
                };
                const newDocRef = doc(transactionsRef);
                batch.set(newDocRef, transactionDoc);
            });
            
            await batch.commit();
        }
        
        return docRef.id;
    }
}

// ============================================
// Balance Sheet Operations
// ============================================

export async function saveBalanceSheet(
    userId: string,
    fileName: string,
    data: BalanceSheetData
): Promise<string> {
    const balanceRef = collection(db, 'balanceSheets');
    const balanceData: BalanceSheetDocument = {
        userId,
        fileName,
        uploadedAt: Timestamp.now(),
        date: data.date,
        totalItems: data.total_items,
        equity: data.equity,
        assets: {
            total: data.assets.total,
            byCategory: data.assets.by_category,
        },
        liabilities: {
            total: data.liabilities.total,
            byCategory: data.liabilities.by_category,
        },
    };
    const docRef = await addDoc(balanceRef, balanceData);

    // Save items in subcollection
    if (data.items && data.items.length > 0) {
        const itemsRef = collection(db, 'balanceSheets', docRef.id, 'items');
        const batch = writeBatch(db);

        data.items.forEach((item) => {
            const itemDoc: BalanceSheetItemDocument = {
                name: item.name,
                type: item.type,
                category: item.category,
                value: item.value,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            batch.set(newDocRef, itemDoc);
        });

        await batch.commit();
    }

    return docRef.id;
}

export async function getBalanceSheets(
    userId: string,
    maxCount: number = 20
): Promise<BalanceSheetWithId[]> {
    const balanceRef = collection(db, 'balanceSheets');
    // Note: Removed orderBy to avoid requiring composite index
    const q = query(
        balanceRef,
        where('userId', '==', userId),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    const balanceSheets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as BalanceSheetWithId[];
    // Sort by uploadedAt descending client-side
    return balanceSheets.sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());
}

export async function getBalanceSheetItems(
    balanceSheetId: string
): Promise<BalanceSheetItem[]> {
    const itemsRef = collection(db, 'balanceSheets', balanceSheetId, 'items');
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map((doc) => {
        const data = doc.data() as BalanceSheetItemDocument;
        return {
            name: data.name,
            type: data.type,
            category: data.category,
            value: data.value,
            confidence: data.confidence,
        };
    });
}

export async function deleteBalanceSheet(balanceSheetId: string): Promise<void> {
    const itemsRef = collection(db, 'balanceSheets', balanceSheetId, 'items');
    const itemsSnapshot = await getDocs(itemsRef);

    const batch = writeBatch(db);
    itemsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    const balanceRef = doc(db, 'balanceSheets', balanceSheetId);
    batch.delete(balanceRef);

    await batch.commit();
}

/**
 * Get or create the master balance sheet document for a user.
 */
async function getOrCreateMasterBalanceSheet(userId: string): Promise<string | null> {
    const balanceRef = collection(db, 'balanceSheets');
    const q = query(
        balanceRef,
        where('userId', '==', userId),
        where('isMerged', '==', true),
        limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length > 0) {
        return snapshot.docs[0].id;
    }
    return null;
}

/**
 * Merge balance sheet history - updates existing master document or creates new one
 */
export async function mergeBalanceSheetHistory(
    userId: string,
    fileName: string,
    mergedData: BalanceSheetData
): Promise<string> {
    const existingMasterId = await getOrCreateMasterBalanceSheet(userId);
    
    if (existingMasterId) {
        // Update existing master document
        const balanceRef = doc(db, 'balanceSheets', existingMasterId);
        
        await updateDoc(balanceRef, {
            uploadedAt: Timestamp.now(),
            date: mergedData.date,
            totalItems: mergedData.total_items,
            equity: mergedData.equity,
            assets: {
                total: mergedData.assets.total,
                byCategory: mergedData.assets.by_category,
            },
            liabilities: {
                total: mergedData.liabilities.total,
                byCategory: mergedData.liabilities.by_category,
            },
            sourceFiles: arrayUnion(fileName),
            lastMergedAt: Timestamp.now(),
        });
        
        // Clear existing items and replace with merged set
        const itemsRef = collection(db, 'balanceSheets', existingMasterId, 'items');
        const existingItems = await getDocs(itemsRef);
        
        const deleteBatch = writeBatch(db);
        existingItems.docs.forEach((docSnap) => {
            deleteBatch.delete(docSnap.ref);
        });
        await deleteBatch.commit();
        
        // Add merged items
        const addBatch = writeBatch(db);
        mergedData.items.forEach((item) => {
            const itemDoc: BalanceSheetItemDocument = {
                name: item.name,
                type: item.type,
                category: item.category,
                value: item.value,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            addBatch.set(newDocRef, itemDoc);
        });
        await addBatch.commit();
        
        return existingMasterId;
    } else {
        // Create new master document
        const balanceRef = collection(db, 'balanceSheets');
        const balanceData: BalanceSheetDocument = {
            userId,
            fileName: `Merged: ${fileName}`,
            uploadedAt: Timestamp.now(),
            date: mergedData.date,
            totalItems: mergedData.total_items,
            equity: mergedData.equity,
            assets: {
                total: mergedData.assets.total,
                byCategory: mergedData.assets.by_category,
            },
            liabilities: {
                total: mergedData.liabilities.total,
                byCategory: mergedData.liabilities.by_category,
            },
            sourceFiles: [fileName],
            isMerged: true,
            lastMergedAt: Timestamp.now(),
        };
        const docRef = await addDoc(balanceRef, balanceData);
        
        // Save items in subcollection
        const itemsRef = collection(db, 'balanceSheets', docRef.id, 'items');
        const batch = writeBatch(db);
        
        mergedData.items.forEach((item) => {
            const itemDoc: BalanceSheetItemDocument = {
                name: item.name,
                type: item.type,
                category: item.category,
                value: item.value,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            batch.set(newDocRef, itemDoc);
        });
        await batch.commit();
        
        return docRef.id;
    }
}

// ============================================
// Income Statement Operations
// ============================================

export async function saveIncomeStatement(
    userId: string,
    fileName: string,
    data: IncomeStatementData
): Promise<string> {
    const incomeRef = collection(db, 'incomeStatements');
    const incomeData: IncomeStatementDocument = {
        userId,
        fileName,
        uploadedAt: Timestamp.now(),
        period: data.period,
        totalItems: data.total_items,
        grossProfit: data.gross_profit,
        netIncome: data.net_income,
        revenues: {
            total: data.revenues.total,
            byCategory: data.revenues.by_category,
        },
        expenses: {
            total: data.expenses.total,
            byCategory: data.expenses.by_category,
        },
    };
    const docRef = await addDoc(incomeRef, incomeData);

    // Save items in subcollection
    if (data.items && data.items.length > 0) {
        const itemsRef = collection(db, 'incomeStatements', docRef.id, 'items');
        const batch = writeBatch(db);

        data.items.forEach((item) => {
            const itemDoc: IncomeStatementItemDocument = {
                description: item.description,
                type: item.type,
                category: item.category,
                amount: item.amount,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            batch.set(newDocRef, itemDoc);
        });

        await batch.commit();
    }

    return docRef.id;
}

export async function getIncomeStatements(
    userId: string,
    maxCount: number = 20
): Promise<IncomeStatementWithId[]> {
    const incomeRef = collection(db, 'incomeStatements');
    // Note: Removed orderBy to avoid requiring composite index
    const q = query(
        incomeRef,
        where('userId', '==', userId),
        limit(maxCount)
    );
    const snapshot = await getDocs(q);
    const statements = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as IncomeStatementWithId[];
    // Sort by uploadedAt descending client-side
    return statements.sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());
}

export async function getIncomeStatementItems(
    incomeStatementId: string
): Promise<IncomeStatementItem[]> {
    const itemsRef = collection(db, 'incomeStatements', incomeStatementId, 'items');
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map((doc) => {
        const data = doc.data() as IncomeStatementItemDocument;
        return {
            description: data.description,
            type: data.type,
            category: data.category,
            amount: data.amount,
            confidence: data.confidence,
        };
    });
}

export async function deleteIncomeStatement(incomeStatementId: string): Promise<void> {
    const itemsRef = collection(db, 'incomeStatements', incomeStatementId, 'items');
    const itemsSnapshot = await getDocs(itemsRef);

    const batch = writeBatch(db);
    itemsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    const incomeRef = doc(db, 'incomeStatements', incomeStatementId);
    batch.delete(incomeRef);

    await batch.commit();
}

/**
 * Get or create the master income statement document for a user.
 */
async function getOrCreateMasterIncomeStatement(userId: string): Promise<string | null> {
    const incomeRef = collection(db, 'incomeStatements');
    const q = query(
        incomeRef,
        where('userId', '==', userId),
        where('isMerged', '==', true),
        limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length > 0) {
        return snapshot.docs[0].id;
    }
    return null;
}

/**
 * Merge income statement history - updates existing master document or creates new one
 */
export async function mergeIncomeStatementHistory(
    userId: string,
    fileName: string,
    mergedData: IncomeStatementData
): Promise<string> {
    const existingMasterId = await getOrCreateMasterIncomeStatement(userId);
    
    if (existingMasterId) {
        // Update existing master document
        const incomeRef = doc(db, 'incomeStatements', existingMasterId);
        
        await updateDoc(incomeRef, {
            uploadedAt: Timestamp.now(),
            period: mergedData.period,
            totalItems: mergedData.total_items,
            grossProfit: mergedData.gross_profit,
            netIncome: mergedData.net_income,
            revenues: {
                total: mergedData.revenues.total,
                byCategory: mergedData.revenues.by_category,
            },
            expenses: {
                total: mergedData.expenses.total,
                byCategory: mergedData.expenses.by_category,
            },
            sourceFiles: arrayUnion(fileName),
            lastMergedAt: Timestamp.now(),
        });
        
        // Clear existing items and replace with merged set
        const itemsRef = collection(db, 'incomeStatements', existingMasterId, 'items');
        const existingItems = await getDocs(itemsRef);
        
        const deleteBatch = writeBatch(db);
        existingItems.docs.forEach((docSnap) => {
            deleteBatch.delete(docSnap.ref);
        });
        await deleteBatch.commit();
        
        // Add merged items
        const addBatch = writeBatch(db);
        mergedData.items.forEach((item) => {
            const itemDoc: IncomeStatementItemDocument = {
                description: item.description,
                type: item.type,
                category: item.category,
                amount: item.amount,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            addBatch.set(newDocRef, itemDoc);
        });
        await addBatch.commit();
        
        return existingMasterId;
    } else {
        // Create new master document
        const incomeRef = collection(db, 'incomeStatements');
        const incomeData: IncomeStatementDocument = {
            userId,
            fileName: `Merged: ${fileName}`,
            uploadedAt: Timestamp.now(),
            period: mergedData.period,
            totalItems: mergedData.total_items,
            grossProfit: mergedData.gross_profit,
            netIncome: mergedData.net_income,
            revenues: {
                total: mergedData.revenues.total,
                byCategory: mergedData.revenues.by_category,
            },
            expenses: {
                total: mergedData.expenses.total,
                byCategory: mergedData.expenses.by_category,
            },
            sourceFiles: [fileName],
            isMerged: true,
            lastMergedAt: Timestamp.now(),
        };
        const docRef = await addDoc(incomeRef, incomeData);
        
        // Save items in subcollection
        const itemsRef = collection(db, 'incomeStatements', docRef.id, 'items');
        const batch = writeBatch(db);
        
        mergedData.items.forEach((item) => {
            const itemDoc: IncomeStatementItemDocument = {
                description: item.description,
                type: item.type,
                category: item.category,
                amount: item.amount,
                confidence: item.confidence,
            };
            const newDocRef = doc(itemsRef);
            batch.set(newDocRef, itemDoc);
        });
        await batch.commit();
        
        return docRef.id;
    }
}

// ============================================
// Data Cleanup Operations (2-year old records)
// ============================================

/**
 * Clean up records older than 2 years for a specific user.
 * Call this on app load or periodically.
 * Returns the count of deleted records.
 */
export async function cleanupOldRecords(userId: string): Promise<{
    conversations: number;
    budgetHistory: number;
    balanceSheets: number;
    incomeStatements: number;
}> {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoffTimestamp = Timestamp.fromDate(twoYearsAgo);

    let conversationsDeleted = 0;
    let budgetHistoryDeleted = 0;
    let balanceSheetsDeleted = 0;
    let incomeStatementsDeleted = 0;

    // Clean up old conversations
    const conversationsRef = collection(db, 'conversations');
    const oldConversationsQuery = query(
        conversationsRef,
        where('userId', '==', userId),
        where('updatedAt', '<', cutoffTimestamp)
    );
    const oldConversations = await getDocs(oldConversationsQuery);
    for (const conversationDoc of oldConversations.docs) {
        await deleteConversation(conversationDoc.id);
        conversationsDeleted++;
    }

    // Clean up old budget history
    const budgetRef = collection(db, 'budgetHistory');
    const oldBudgetQuery = query(
        budgetRef,
        where('userId', '==', userId),
        where('uploadedAt', '<', cutoffTimestamp)
    );
    const oldBudgets = await getDocs(oldBudgetQuery);
    for (const budgetDoc of oldBudgets.docs) {
        await deleteBudgetHistory(budgetDoc.id);
        budgetHistoryDeleted++;
    }

    // Clean up old balance sheets
    const balanceRef = collection(db, 'balanceSheets');
    const oldBalanceQuery = query(
        balanceRef,
        where('userId', '==', userId),
        where('uploadedAt', '<', cutoffTimestamp)
    );
    const oldBalanceSheets = await getDocs(oldBalanceQuery);
    for (const balanceDoc of oldBalanceSheets.docs) {
        await deleteBalanceSheet(balanceDoc.id);
        balanceSheetsDeleted++;
    }

    // Clean up old income statements
    const incomeRef = collection(db, 'incomeStatements');
    const oldIncomeQuery = query(
        incomeRef,
        where('userId', '==', userId),
        where('uploadedAt', '<', cutoffTimestamp)
    );
    const oldIncomeStatements = await getDocs(oldIncomeQuery);
    for (const incomeDoc of oldIncomeStatements.docs) {
        await deleteIncomeStatement(incomeDoc.id);
        incomeStatementsDeleted++;
    }

    console.log(`Cleanup complete: ${conversationsDeleted} conversations, ${budgetHistoryDeleted} budgets, ${balanceSheetsDeleted} balance sheets, ${incomeStatementsDeleted} income statements deleted.`);

    return {
        conversations: conversationsDeleted,
        budgetHistory: budgetHistoryDeleted,
        balanceSheets: balanceSheetsDeleted,
        incomeStatements: incomeStatementsDeleted,
    };
}
