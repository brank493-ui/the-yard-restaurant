/**
 * Admin Users API
 * Handles listing users with pagination, user activity summary, and filtering
 * for The Yard Restaurant Admin Dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { format, startOfDay, endOfDay } from 'date-fns';

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  email: string;
  phone?: string;
  ordersCount: number;
  reservationsCount: number;
  eventsCount: number;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  paymentMethod?: string;
  lastActivity: Date | null;
  createdAt?: Date;
}

interface Order {
  id: string;
  userId?: string;
  customerName: string;
  email?: string;
  phone?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionReference?: string;
  createdAt: Date;
}

interface Reservation {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  createdAt: Date;
}

interface Event {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  guestCount?: number;
  totalAmount?: number;
  status: string;
  paymentStatus?: string;
  createdAt: Date;
}

interface Review {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  rating: number;
  text: string;
  createdAt: Date;
}

/**
 * Verify admin access
 */
async function verifyAdmin(request: NextRequest): Promise<{ uid: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  const adminAuth = getAdminAuth();
  
  if (!adminAuth) {
    return null;
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminDb = getAdminDb();
    
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role === 'ADMIN' || userData?.role === 'MANAGER') {
        return { uid: decodedToken.uid, role: userData.role };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/users
 * Get users with their activity summary
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const search = searchParams.get('search') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const sortBy = searchParams.get('sortBy') || 'lastActivity';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeGuests = searchParams.get('includeGuests') === 'true';
    
    const date = dateStr ? new Date(dateStr) : new Date();
    
    const result = await getUsersWithActivity({
      date,
      search,
      paymentStatus,
      page,
      pageSize,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
      includeGuests,
    });
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching users with activity:', error);
    return NextResponse.json({ 
      users: [], 
      total: 0,
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}

/**
 * Get users with their activities for a specific date
 */
async function getUsersWithActivity(options: {
  date: Date;
  search?: string;
  paymentStatus?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  includeGuests: boolean;
}): Promise<{ users: UserActivity[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const adminDb = getAdminDb();
  
  const start = startOfDay(options.date);
  const end = endOfDay(options.date);
  const dateStr = format(options.date, 'yyyy-MM-dd');
  
  // Demo data storage
  const demoUsers: Array<{ id: string; email: string; displayName?: string; phone?: string; role: string }> = [];
  const demoOrders: Order[] = [];
  const demoReservations: Reservation[] = [];
  const demoEvents: Event[] = [];
  const demoReviews: Review[] = [];
  
  if (!adminDb) {
    // Generate demo data
    generateDemoData(demoUsers, demoOrders, demoReservations, demoEvents, demoReviews, start, end, dateStr);
  }
  
  const users = adminDb ? await fetchUsersFromFirebase(adminDb) : demoUsers;
  const orders = adminDb ? await fetchOrdersFromFirebase(adminDb, start, end) : demoOrders;
  const reservations = adminDb ? await fetchReservationsFromFirebase(adminDb, dateStr) : demoReservations;
  const events = adminDb ? await fetchEventsFromFirebase(adminDb, start, end) : demoEvents;
  const reviews = adminDb ? await fetchReviewsFromFirebase(adminDb, start, end) : demoReviews;
  
  // Build user activity map
  const userActivityMap = new Map<string, UserActivity>();
  
  // Process orders
  orders.forEach(order => {
    const userId = order.userId || (options.includeGuests ? `guest_${order.id}` : null);
    if (!userId) return;
    
    if (!userActivityMap.has(userId)) {
      const user = users.find(u => u.id === userId) || {
        id: userId,
        email: order.email || '',
        displayName: order.customerName,
        phone: order.phone,
      };
      
      userActivityMap.set(userId, {
        id: userId,
        userId,
        userName: user.displayName || order.customerName,
        email: user.email || order.email || '',
        phone: user.phone || order.phone,
        ordersCount: 0,
        reservationsCount: 0,
        eventsCount: 0,
        totalAmount: 0,
        paymentStatus: 'PENDING',
        lastActivity: null,
      });
    }
    
    const activity = userActivityMap.get(userId)!;
    activity.ordersCount++;
    activity.totalAmount += order.totalAmount || 0;
    
    if (!activity.lastActivity || new Date(order.createdAt) > activity.lastActivity) {
      activity.lastActivity = new Date(order.createdAt);
    }
  });
  
  // Process reservations
  reservations.forEach(reservation => {
    const userId = reservation.userId || (options.includeGuests ? `guest_${reservation.id}` : null);
    if (!userId) return;
    
    if (!userActivityMap.has(userId)) {
      const user = users.find(u => u.id === userId) || {
        id: userId,
        email: reservation.email,
        displayName: reservation.name,
        phone: reservation.phone,
      };
      
      userActivityMap.set(userId, {
        id: userId,
        userId,
        userName: user.displayName || reservation.name,
        email: user.email || reservation.email,
        phone: user.phone || reservation.phone,
        ordersCount: 0,
        reservationsCount: 0,
        eventsCount: 0,
        totalAmount: 0,
        paymentStatus: 'PENDING',
        lastActivity: null,
      });
    }
    
    const activity = userActivityMap.get(userId)!;
    activity.reservationsCount++;
    
    if (!activity.lastActivity || new Date(reservation.createdAt) > activity.lastActivity) {
      activity.lastActivity = new Date(reservation.createdAt);
    }
  });
  
  // Process events
  events.forEach(event => {
    const userId = event.userId || (options.includeGuests ? `guest_${event.id}` : null);
    if (!userId) return;
    
    if (!userActivityMap.has(userId)) {
      const user = users.find(u => u.id === userId) || {
        id: userId,
        email: event.email,
        displayName: event.name,
        phone: event.phone,
      };
      
      userActivityMap.set(userId, {
        id: userId,
        userId,
        userName: user.displayName || event.name,
        email: user.email || event.email,
        phone: user.phone || '',
        ordersCount: 0,
        reservationsCount: 0,
        eventsCount: 0,
        totalAmount: 0,
        paymentStatus: 'PENDING',
        lastActivity: null,
      });
    }
    
    const activity = userActivityMap.get(userId)!;
    activity.eventsCount++;
    activity.totalAmount += event.totalAmount || 0;
    
    if (!activity.lastActivity || new Date(event.createdAt) > activity.lastActivity) {
      activity.lastActivity = new Date(event.createdAt);
    }
  });
  
  // Calculate payment status for each user
  userActivityMap.forEach(activity => {
    const userOrders = orders.filter(o => o.userId === activity.userId || `guest_${o.id}` === activity.userId);
    const paidOrders = userOrders.filter(o => o.paymentStatus === 'PAID');
    
    if (paidOrders.length === userOrders.length && userOrders.length > 0) {
      activity.paymentStatus = 'PAID';
    } else if (paidOrders.length > 0) {
      activity.paymentStatus = 'PARTIAL';
    } else {
      activity.paymentStatus = 'PENDING';
    }
    
    // Set primary payment method
    if (userOrders.length > 0 && userOrders[0].paymentMethod) {
      activity.paymentMethod = userOrders[0].paymentMethod;
    }
  });
  
  // Convert to array and apply filters
  let activities = Array.from(userActivityMap.values());
  
  // Apply search filter
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    activities = activities.filter(a => 
      a.userName.toLowerCase().includes(searchLower) ||
      a.email.toLowerCase().includes(searchLower) ||
      (a.phone && a.phone.includes(options.search!))
    );
  }
  
  // Apply payment status filter
  if (options.paymentStatus) {
    activities = activities.filter(a => a.paymentStatus === options.paymentStatus);
  }
  
  // Sort
  activities.sort((a, b) => {
    let comparison = 0;
    
    switch (options.sortBy) {
      case 'userName':
        comparison = a.userName.localeCompare(b.userName);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'totalAmount':
        comparison = a.totalAmount - b.totalAmount;
        break;
      case 'ordersCount':
        comparison = a.ordersCount - b.ordersCount;
        break;
      case 'lastActivity':
        comparison = (a.lastActivity?.getTime() || 0) - (b.lastActivity?.getTime() || 0);
        break;
      default:
        comparison = (a.lastActivity?.getTime() || 0) - (b.lastActivity?.getTime() || 0);
    }
    
    return options.sortOrder === 'desc' ? -comparison : comparison;
  });
  
  // Paginate
  const total = activities.length;
  const totalPages = Math.ceil(total / options.pageSize);
  const startIndex = (options.page - 1) * options.pageSize;
  const paginatedActivities = activities.slice(startIndex, startIndex + options.pageSize);
  
  return {
    users: paginatedActivities,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages,
  };
}

/**
 * Fetch users from Firebase
 */
async function fetchUsersFromFirebase(adminDb: FirebaseFirestore.Firestore) {
  const snapshot = await adminDb.collection('users').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; email: string; displayName?: string; phone?: string; role: string }>;
}

/**
 * Fetch orders from Firebase
 */
async function fetchOrdersFromFirebase(adminDb: FirebaseFirestore.Firestore, start: Date, end: Date) {
  const snapshot = await adminDb.collection('orders')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
  })) as Order[];
}

/**
 * Fetch reservations from Firebase
 */
async function fetchReservationsFromFirebase(adminDb: FirebaseFirestore.Firestore, dateStr: string) {
  const snapshot = await adminDb.collection('reservations')
    .where('date', '==', dateStr)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
  })) as Reservation[];
}

/**
 * Fetch events from Firebase
 */
async function fetchEventsFromFirebase(adminDb: FirebaseFirestore.Firestore, start: Date, end: Date) {
  const snapshot = await adminDb.collection('events')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
  })) as Event[];
}

/**
 * Fetch reviews from Firebase
 */
async function fetchReviewsFromFirebase(adminDb: FirebaseFirestore.Firestore, start: Date, end: Date) {
  const snapshot = await adminDb.collection('reviews')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
  })) as Review[];
}

/**
 * Generate demo data for testing
 */
function generateDemoData(
  users: Array<{ id: string; email: string; displayName?: string; phone?: string; role: string }>,
  orders: Order[],
  reservations: Reservation[],
  events: Event[],
  reviews: Review[],
  start: Date,
  end: Date,
  dateStr: string
) {
  // Generate demo users
  const userNames = [
    'John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah',
    'Grace Fomba', 'David Nkwi', 'Rose Fotso', 'James Atangana', 'Catherine Ngu'
  ];
  
  for (let i = 0; i < 10; i++) {
    users.push({
      id: `user_${i}`,
      email: `user${i}@example.com`,
      displayName: userNames[i],
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      role: i === 0 ? 'ADMIN' : 'CUSTOMER',
    });
  }
  
  // Generate demo orders
  for (let i = 0; i < 25; i++) {
    const hour = Math.floor(Math.random() * 14) + 8;
    const orderDate = new Date(start);
    orderDate.setHours(hour, Math.floor(Math.random() * 60));
    
    orders.push({
      id: `ord_${Date.now()}_${i}`,
      userId: `user_${i % 10}`,
      customerName: userNames[i % 10],
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      email: `user${i % 10}@example.com`,
      items: [
        { 
          name: ['Grilled Fish', 'Jollof Rice', 'Suya Platter', 'Pepper Soup', 'Fried Plantains'][i % 5], 
          quantity: Math.floor(Math.random() * 3) + 1, 
          price: Math.floor(Math.random() * 5000) + 2000 
        },
      ],
      totalAmount: Math.floor(Math.random() * 20000) + 5000,
      status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'][Math.floor(Math.random() * 5)],
      paymentStatus: ['PENDING', 'PAID', 'PROCESSING'][Math.floor(Math.random() * 3)],
      paymentMethod: ['CASH', 'ORANGE_MONEY', 'MTN_MONEY'][Math.floor(Math.random() * 3)],
      createdAt: orderDate,
    });
  }
  
  // Generate demo reservations
  for (let i = 0; i < 12; i++) {
    reservations.push({
      id: `res_${Date.now()}_${i}`,
      userId: `user_${i % 8}`,
      name: userNames[i % 8],
      email: `user${i % 8}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      date: dateStr,
      time: ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'][i % 6],
      partySize: Math.floor(Math.random() * 8) + 2,
      status: ['PENDING', 'CONFIRMED', 'COMPLETED'][Math.floor(Math.random() * 3)],
      createdAt: start,
    });
  }
  
  // Generate demo events
  for (let i = 0; i < 5; i++) {
    events.push({
      id: `evt_${Date.now()}_${i}`,
      userId: `user_${i % 5}`,
      name: userNames[i % 5],
      email: `user${i % 5}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      eventType: ['CORPORATE', 'BIRTHDAY', 'WEDDING', 'ANNIVERSARY', 'BUSINESS'][i],
      guestCount: Math.floor(Math.random() * 50) + 10,
      totalAmount: Math.floor(Math.random() * 200000) + 50000,
      status: ['INQUIRY', 'QUOTED', 'CONFIRMED'][Math.floor(Math.random() * 3)],
      paymentStatus: ['PENDING', 'PAID'][Math.floor(Math.random() * 2)],
      createdAt: start,
    });
  }
  
  // Generate demo reviews
  for (let i = 0; i < 8; i++) {
    reviews.push({
      id: `rev_${Date.now()}_${i}`,
      userId: `user_${i % 8}`,
      name: userNames[i % 8],
      email: `user${i % 8}@example.com`,
      rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      text: ['Excellent food!', 'Great service!', 'Wonderful ambiance!', 'Will come again!'][i % 4],
      createdAt: start,
    });
  }
}
