import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Target
} from 'lucide-react';

interface DashboardStats {
  totalVendors: number;
  totalProspects: number;
  totalMatches: number;
  totalMeetings: number;
  pendingMatches: number;
  monthlyRevenue: number;
  conversionRate: number;
  avgMatchScore: number;
}

interface RecentActivity {
  id: number;
  type: 'match' | 'meeting' | 'vendor' | 'prospect';
  description: string;
  timestamp: string;
  status?: string;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        axios.get('/api/admin/dashboard/stats'),
        axios.get('/api/admin/dashboard/activities')
      ]);
      
      setStats(statsResponse.data);
      setActivities(activitiesResponse.data);
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

  const statCards = [
    {
      title: 'Total Vendors',
      value: stats?.totalVendors || 0,
      icon: Users,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Active Prospects', 
      value: stats?.totalProspects || 0,
      icon: Target,
      color: 'green',
      change: '+8%'
    },
    {
      title: 'Pending Matches',
      value: stats?.pendingMatches || 0,
      icon: Clock,
      color: 'yellow',
      change: '+5'
    },
    {
      title: 'This Month Revenue',
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'purple',
      change: '+23%'
    }
  ];

  const getIconColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      purple: 'text-purple-600 bg-purple-100'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'match': return CheckCircle;
      case 'meeting': return Calendar;
      case 'vendor': return Users;
      case 'prospect': return Target;
      default: return AlertCircle;
    }
  };

  const getActivityColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's what's happening with your AI matchmaking platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${getIconColor(card.color)}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <div className="flex items-center">
                  <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  <span className="ml-2 text-sm text-green-600">{card.change}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Metrics */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.conversionRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.avgMatchScore.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Avg Match Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats?.totalMeetings}</div>
              <div className="text-sm text-gray-600">Total Meetings</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
              Review Pending Matches
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium">
              Add New Vendor
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium">
              Generate Report
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.slice(0, 6).map((activity) => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`mt-1 ${getActivityColor(activity.status)}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
            <div>
              <p className="text-sm font-medium text-green-800">API Status</p>
              <p className="text-xs text-green-600">All systems operational</p>
            </div>
            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
            <div>
              <p className="text-sm font-medium text-green-800">AI Matching</p>
              <p className="text-xs text-green-600">99.9% uptime</p>
            </div>
            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
            <div>
              <p className="text-sm font-medium text-green-800">Calendar Sync</p>
              <p className="text-xs text-green-600">Active</p>
            </div>
            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <div>
              <p className="text-sm font-medium text-yellow-800">MDF Processing</p>
              <p className="text-xs text-yellow-600">Minor delays</p>
            </div>
            <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};