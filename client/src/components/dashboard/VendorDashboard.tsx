import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star
} from 'lucide-react';

interface VendorStats {
  totalMeetings: number;
  upcomingMeetings: number;
  completedMeetings: number;
  mdfBudget: number;
  mdfUsed: number;
  mdfRemaining: number;
  avgMeetingRating: number;
  newProspects: number;
}

interface Meeting {
  id: number;
  title: string;
  prospect: {
    company_name: string;
    contact_name: string;
  };
  scheduled_at: string;
  status: string;
  meet_link?: string;
}

export const VendorDashboard: React.FC = () => {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, meetingsResponse] = await Promise.all([
        axios.get('/api/vendors/dashboard/stats'),
        axios.get('/api/meetings?status=upcoming&limit=5')
      ]);
      
      setStats(statsResponse.data);
      setUpcomingMeetings(meetingsResponse.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const mdfUtilization = stats ? (stats.mdfUsed / stats.mdfBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track your meetings, MDF budget, and performance metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Meetings</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{stats?.upcomingMeetings || 0}</p>
                <span className="ml-2 text-sm text-green-600">+2 this week</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Meetings</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{stats?.completedMeetings || 0}</p>
                <span className="ml-2 text-sm text-green-600">This month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Prospects</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{stats?.newProspects || 0}</p>
                <span className="ml-2 text-sm text-green-600">+3 this week</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <Star className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">{stats?.avgMeetingRating?.toFixed(1) || '0.0'}</p>
                <span className="ml-2 text-sm text-gray-500">/ 5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MDF Budget Tracking */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">MDF Budget Overview</h3>
          
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Budget Utilization</span>
              <span>{mdfUtilization.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(mdfUtilization, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">${stats?.mdfBudget?.toLocaleString() || '0'}</div>
              <div className="text-sm text-gray-600">Total Budget</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">${stats?.mdfUsed?.toLocaleString() || '0'}</div>
              <div className="text-sm text-gray-600">Used</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">${stats?.mdfRemaining?.toLocaleString() || '0'}</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
              View Expenses
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">
              Request Budget Increase
            </button>
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Meetings</h3>
            <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {meeting.prospect.company_name}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {new Date(meeting.scheduled_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    with {meeting.prospect.contact_name}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {new Date(meeting.scheduled_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  {meeting.meet_link && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-500"
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No upcoming meetings</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">87%</div>
            <div className="text-sm text-gray-600">Meeting Show Rate</div>
            <div className="text-xs text-gray-500 mt-1">vs 82% platform average</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">65%</div>
            <div className="text-sm text-gray-600">Follow-up Rate</div>
            <div className="text-xs text-gray-500 mt-1">vs 58% platform average</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">23%</div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
            <div className="text-xs text-gray-500 mt-1">vs 19% platform average</div>
          </div>
        </div>
      </div>

      {/* Calendar Integration Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Calendar Integration</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Google Calendar Connected</p>
              <p className="text-xs text-gray-500">Automatic meeting scheduling enabled</p>
            </div>
          </div>
          <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Manage
          </button>
        </div>
      </div>
    </div>
  );
};