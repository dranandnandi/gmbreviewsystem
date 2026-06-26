import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Users, Calendar, MessageSquare, Clock, Activity, BarChart, FileText, Plus, Send, Star, Home, ArrowRight, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isToday, isPast, addDays, isAfter, startOfDay } from 'date-fns';
import { MessageCard } from '../components/MessageCard';
import { hasFeature } from '../config/features';

export function DashboardPage() {
  const { 
    user, 
    appointments, 
    reviews, 
    reportRequests, 
    sequenceMessages,
    fetchSequenceMessages,
    lazyLoadAppointments,
    lazyLoadReviews,
    lazyLoadReportRequests,
    lazyLoadSequenceMessages
  } = useStore();
  const navigate = useNavigate();
  
  // Check if user needs to complete business setup
  React.useEffect(() => {
    if (user && user.clinicName?.includes("'s Business")) {
      navigate('/business-setup');
      return;
    }
  }, [user, navigate]);
  
  // Lazy load data when dashboard mounts
  React.useEffect(() => {
    if (user?.id) {
      // Load critical dashboard data
      Promise.all([
        lazyLoadAppointments(),
        lazyLoadReviews(),
        lazyLoadReportRequests(),
        lazyLoadSequenceMessages()
      ]).catch(console.error);
    }
  }, [user?.id, lazyLoadAppointments, lazyLoadReviews, lazyLoadReportRequests, lazyLoadSequenceMessages]);

  // Filter stats based on enabled features
  const isFeatureEnabled = (feature: string) => {
    return hasFeature(user, feature);
  };

  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const sentReviews = reviews.filter(r => r.status === 'sent').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
  const pendingReports = reportRequests.filter(r => r.status === 'pending').length;
  const completedReports = reportRequests.filter(r => r.status === 'completed').length;

  // Get upcoming appointments (next 7 days)
  const upcomingAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(`${apt.appointmentDate}T${apt.appointmentTime}`);
      const today = startOfDay(new Date());
      const nextWeek = addDays(today, 7);
      return isAfter(aptDate, today) && aptDate <= nextWeek && apt.status === 'pending';
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  // Get pending sequence messages
  const pendingSequenceMessages = sequenceMessages.filter(message => message.status === 'pending');

  // Categorize sequence messages
  const dueTodayMessages = pendingSequenceMessages.filter(message => 
    isToday(new Date(message.scheduledDate))
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 3); // Show only first 3

  const overdueMessages = pendingSequenceMessages.filter(message => {
    const messageDate = new Date(message.scheduledDate);
    return isPast(messageDate) && !isToday(messageDate);
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 3); // Show only first 3

  // Get pending sequence messages due today or overdue
  const urgentSequenceMessages = sequenceMessages.filter(msg => {
    const msgDate = new Date(msg.scheduledDate);
    return msg.status === 'pending' && (isToday(msgDate) || isPast(msgDate));
  }).length;

  const allStats = [
    {
      name: 'Total Appointments',
      value: appointments.length,
      subtext: `${completedAppointments} completed, ${pendingAppointments} pending`,
      icon: Calendar,
      color: 'bg-blue-500',
      link: '/appointments',
      feature: 'appointments'
    },
    {
      name: 'Pending Reviews',
      value: pendingReviews,
      subtext: 'Awaiting follow-up',
      icon: MessageSquare,
      color: 'bg-green-500',
      link: '/reviews',
      feature: 'reviews'
    },
    {
      name: 'Completed Reviews',
      value: sentReviews,
      subtext: `${reviews.length > 0 ? ((sentReviews / reviews.length) * 100).toFixed(0) : 0}% completion rate`,
      icon: Users,
      color: 'bg-purple-500',
      link: '/reviews',
      feature: 'reviews'
    },
    {
      name: 'Smart Reports',
      value: reportRequests.length,
      subtext: `${completedReports} completed, ${pendingReports} pending`,
      icon: FileText,
      color: 'bg-orange-500',
      link: '/reports',
      feature: 'reports'
    },
  ];

  // Filter stats based on enabled features
  const stats = allStats.filter(stat => !stat.feature || isFeatureEnabled(stat.feature));

  const quickActions = [
    {
      name: 'Schedule Appointment',
      description: 'Book a new patient appointment',
      icon: Plus,
      color: 'bg-blue-600 hover:bg-blue-700',
      link: '/appointments',
      feature: 'appointments'
    },
    {
      name: 'Create Review Request',
      description: 'Add a new patient review request',
      icon: Star,
      color: 'bg-green-600 hover:bg-green-700',
      link: '/reviews',
      feature: 'reviews'
    },
    {
      name: 'Quick Send Messages',
      description: 'Send pending sequence messages',
      icon: Send,
      color: 'bg-purple-600 hover:bg-purple-700',
      link: '/quick-send',
      feature: 'sequences'
    },
    {
      name: 'Upload Smart Report',
      description: 'Create a new report request',
      icon: FileText,
      color: 'bg-orange-600 hover:bg-orange-700',
      link: '/reports',
      feature: 'reports'
    },
  ].filter(action => !action.feature || isFeatureEnabled(action.feature));

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-indigo-100 text-lg">
              {user?.clinicName} Dashboard
            </p>
            <p className="text-indigo-200 mt-2">
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <Activity className="h-12 w-12 text-white mb-2" />
              <p className="text-sm text-indigo-100">System Status</p>
              <p className="text-lg font-semibold">All Systems Active</p>
            </div>
          </div>
        </div>

        {/* Quick Stats in Welcome Section */}
        {urgentSequenceMessages > 0 && (
          <div className="mt-6 bg-white bg-opacity-20 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-300 mr-2" />
              <span className="text-yellow-100">
                {urgentSequenceMessages} sequence message{urgentSequenceMessages > 1 ? 's' : ''} need{urgentSequenceMessages === 1 ? 's' : ''} attention
              </span>
              <button
                onClick={() => navigate('/quick-send')}
                className="ml-auto text-yellow-100 hover:text-white transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            onClick={() => navigate(stat.link)}
            key={stat.name}
            className="relative overflow-hidden rounded-xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-100"
          >
            <div className="flex items-center">
              <div className={`rounded-xl p-3 ${stat.color} shadow-lg`}>
                <stat.icon className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
            {stat.subtext && (
              <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                {stat.subtext}
              </p>
            )}
            <div className="absolute top-4 right-4">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-indigo-600" />
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.name}
              onClick={() => navigate(action.link)}
              className={`${action.color} text-white p-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg`}
            >
              <action.icon className="h-8 w-8 mb-3 mx-auto" />
              <h3 className="font-semibold text-sm mb-1">{action.name}</h3>
              <p className="text-xs opacity-90">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Due Today Section */}
      {isFeatureEnabled('sequences') && dueTodayMessages.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-6 w-6 mr-2 text-blue-600" />
              Messages Due Today
            </h2>
            <button
              onClick={() => navigate('/quick-send')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {dueTodayMessages.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </div>
          
          {pendingSequenceMessages.filter(m => isToday(new Date(m.scheduledDate))).length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/quick-send')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View {pendingSequenceMessages.filter(m => isToday(new Date(m.scheduledDate))).length - 3} more messages due today
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overdue Messages Section */}
      {isFeatureEnabled('sequences') && overdueMessages.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <AlertCircle className="h-6 w-6 mr-2 text-red-600" />
              Overdue Messages
            </h2>
            <button
              onClick={() => navigate('/quick-send')}
              className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {overdueMessages.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </div>
          
          {pendingSequenceMessages.filter(m => {
            const messageDate = new Date(m.scheduledDate);
            return isPast(messageDate) && !isToday(messageDate);
          }).length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/quick-send')}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                View {pendingSequenceMessages.filter(m => {
                  const messageDate = new Date(m.scheduledDate);
                  return isPast(messageDate) && !isToday(messageDate);
                }).length - 3} more overdue messages
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-blue-600" />
              Upcoming Appointments
            </h2>
            <button
              onClick={() => navigate('/appointments')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No upcoming appointments</p>
              <button
                onClick={() => navigate('/appointments')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Schedule one now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Home className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{appointment.patientName}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`), 'MMM dd, yyyy • h:mm a')}
                        </p>
                        <p className="text-xs text-gray-500">{appointment.doctorName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isToday(new Date(appointment.appointmentDate))
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isToday(new Date(appointment.appointmentDate)) ? 'Today' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Activity className="h-6 w-6 mr-2 text-green-600" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {[...appointments, ...reviews]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {reviews.find(r => r.id === item.id) ? (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        ) : (
                          <Calendar className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.patientName}</p>
                        <p className="text-xs text-gray-600">
                          {reviews.find(r => r.id === item.id) ? 'Review request' : 'Appointment'} • {format(new Date(item.appointmentDate), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'completed' || item.status === 'sent'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart className="h-6 w-6 mr-2 text-purple-600" />
          Performance Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {appointments.length ? `${((completedAppointments / appointments.length) * 100).toFixed(0)}%` : '0%'}
            </p>
            <p className="text-sm text-blue-700">Appointment Completion Rate</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">
              {reviews.length ? `${((sentReviews / reviews.length) * 100).toFixed(0)}%` : '0%'}
            </p>
            <p className="text-sm text-green-700">Review Response Rate</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {appointments.length + reviews.length}
            </p>
            <p className="text-sm text-purple-700">Total Activities This Month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
