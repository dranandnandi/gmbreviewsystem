import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { format, parseISO } from 'date-fns';
import { Palette, Calendar, Link as LinkIcon, Image, Video, MonitorPlay, ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';

export function CreativesPage() {
  const { 
    user, 
    categories, 
    creatives, 
    fetchCategories, 
    lazyLoadCreatives,
    isLoadingCreatives
  } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    try {
      await lazyLoadCreatives(selectedYear, selectedMonth);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCategories();
      lazyLoadCreatives(selectedYear, selectedMonth);
    }
  }, [user?.id, selectedYear, selectedMonth, fetchCategories, lazyLoadCreatives]);

  const filteredCreatives = creatives.filter(creative => {
    const matchesCategory = selectedCategory === 'all' || creative.categoryId === selectedCategory;
    const matchesMonth = creative.monthNumber === selectedMonth && 
                        creative.year === selectedYear;
    return matchesCategory && matchesMonth;
  });

  const handleCopyContent = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getContentIcon = (type: Creative['contentType']) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'iframe': return MonitorPlay;
      case 'link': return LinkIcon;
      default: return Palette;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Palette className="h-6 w-6 mr-2 text-indigo-600" />
          Your Creatives
        </h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              min="2020"
              max="2030"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {format(new Date(2000, month - 1), 'MMMM')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-none self-end">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingCreatives}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || isLoadingCreatives ? 'animate-spin' : ''}`} />
              {isRefreshing || isLoadingCreatives ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {isLoadingCreatives ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading creatives...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreatives.map((creative) => {
              const ContentIcon = getContentIcon(creative.contentType);
              const category = categories.find(c => c.id === creative.categoryId);
              
              return (
                <div key={creative.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <ContentIcon className="h-5 w-5 text-indigo-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">{creative.title}</h3>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {category?.name}
                      </span>
                    </div>
                    
                    {creative.description && (
                      <p className="mt-2 text-sm text-gray-600">{creative.description}</p>
                    )}
                    
                    <div className="mt-4">
                      {creative.contentType === 'iframe' ? (
                        <div 
                          className="relative rounded-lg overflow-hidden bg-gray-50 w-full aspect-[16/10]"
                        >
                          <div
                            className="absolute inset-0"
                            dangerouslySetInnerHTML={{ 
                              __html: creative.content.replace(
                                /style="([^"]*)"/, 
                                'style="width: 100%; height: 100%; border: 0;"'
                              )
                            }}
                          />
                        </div>
                      ) : creative.contentType === 'image' ? (
                        <img 
                          src={creative.content} 
                          alt={creative.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ) : creative.contentType === 'video' ? (
                        <video 
                          src={creative.content}
                          controls
                          className="w-full rounded-lg"
                        />
                      ) : (
                        <a
                          href={creative.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open Link
                        </a>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(creative.year, creative.monthNumber - 1), 'MMMM yyyy')}
                      </div>
                      <button
                        onClick={() => handleCopyContent(creative.content, creative.id)}
                        className="inline-flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {copiedId === creative.id ? (
                          <>
                            <Check className="h-4 w-4 mr-1 text-green-500" />
                            <span className="text-green-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoadingCreatives && filteredCreatives.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            <Palette className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No creatives found for the selected filters.</p>
            <p className="text-sm">Try adjusting your category or month selection.</p>
          </div>
        )}
      </div>
    </div>
  );
}