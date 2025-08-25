import React, { useState, useEffect } from 'react';

type TabType = 'containers' | 'images' | 'volumes' | 'networks';
type SortDirection = 'asc' | 'desc';

interface Container {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  created: number;
  size: number;
}

interface Image {
  id: string;
  repoTags: string[];
  created: number;
  size: number;
  virtualSize: number;
  containers: number;
}

interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  created: string;
  size: number;
  refCount: number;
}

interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  created: string;
}

interface SystemInfo {
  images: { count: number; size: number };
  containers: { count: number; size: number };
  volumes: { count: number; size: number };
}

interface SortConfig {
  key: string;
  direction: SortDirection;
}

const API_BASE = 'http://localhost:3001/api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: number | string): string {
  const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('containers');
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [containersRes, imagesRes, volumesRes, networksRes, systemRes] = await Promise.all([
        fetch(`${API_BASE}/containers`),
        fetch(`${API_BASE}/images`),
        fetch(`${API_BASE}/volumes`),
        fetch(`${API_BASE}/networks`),
        fetch(`${API_BASE}/system`),
      ]);

      if (!containersRes.ok || !imagesRes.ok || !volumesRes.ok || !networksRes.ok || !systemRes.ok) {
        throw new Error('Failed to fetch data');
      }

      setContainers(await containersRes.json() as Container[]);
      setImages(await imagesRes.json() as Image[]);
      setVolumes(await volumesRes.json() as Volume[]);
      setNetworks(await networksRes.json() as Network[]);
      setSystemInfo(await systemRes.json() as SystemInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortItems = (items: any[]) => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle special cases
      if (sortConfig.key === 'name' || sortConfig.key === 'names') {
        if (activeTab === 'containers') {
          aValue = a.names[0]?.replace('/', '') || '';
          bValue = b.names[0]?.replace('/', '') || '';
        } else if (activeTab === 'volumes' || activeTab === 'networks') {
          aValue = a.name;
          bValue = b.name;
        }
      } else if (sortConfig.key === 'repoTags') {
        aValue = a.repoTags[0] || '';
        bValue = b.repoTags[0] || '';
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = (aValue === bValue) ? 0 : aValue ? 1 : -1;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  const handleSelectAll = () => {
    const items = getSortedAndFilteredItems();
    const allIds = items.map((item: any) => 
      activeTab === 'volumes' ? item.name : item.id
    );
    
    if (selectedItems.size === allIds.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allIds));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} selected items?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const endpoint = `${API_BASE}/${activeTab}`;
      const body = activeTab === 'volumes' 
        ? { names: Array.from(selectedItems) }
        : { ids: Array.from(selectedItems) };
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to delete items');
      }

      const result = await response.json() as { results: Array<{ success: boolean }> };
      const failed = result.results.filter((r) => !r.success);
      
      if (failed.length > 0) {
        setError(`Failed to delete ${failed.length} items`);
      }
      
      setSelectedItems(new Set());
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    let items: any[] = [];
    
    switch (activeTab) {
      case 'containers':
        items = containers;
        break;
      case 'images':
        items = images;
        break;
      case 'volumes':
        items = volumes;
        break;
      case 'networks':
        items = networks;
        break;
    }

    if (!searchTerm) return items;

    return items.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      
      switch (activeTab) {
        case 'containers':
          return item.names.some((name: string) => name.toLowerCase().includes(searchLower)) ||
                 item.image.toLowerCase().includes(searchLower) ||
                 item.status.toLowerCase().includes(searchLower);
        case 'images':
          return item.repoTags.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
                 item.id.toLowerCase().includes(searchLower);
        case 'volumes':
          return item.name.toLowerCase().includes(searchLower) ||
                 item.driver.toLowerCase().includes(searchLower);
        case 'networks':
          return item.name.toLowerCase().includes(searchLower) ||
                 item.driver.toLowerCase().includes(searchLower);
        default:
          return false;
      }
    });
  };

  const getSortedAndFilteredItems = () => {
    const filtered = getFilteredItems();
    return sortItems(filtered);
  };

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isSorted = sortConfig?.key === sortKey;
    const isAsc = isSorted && sortConfig.direction === 'asc';
    
    return (
      <th 
        onClick={() => handleSort(sortKey)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {label}
        <span style={{ marginLeft: '5px', fontSize: '12px' }}>
          {isSorted ? (isAsc ? '▲' : '▼') : ''}
        </span>
      </th>
    );
  };

  const renderTable = () => {
    const items = getSortedAndFilteredItems();

    if (items.length === 0) {
      return (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>No {activeTab} found</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'containers':
        return (
          <table className="resource-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                {renderSortableHeader('Name', 'names')}
                {renderSortableHeader('Image', 'image')}
                {renderSortableHeader('Status', 'status')}
                {renderSortableHeader('Created', 'created')}
                {renderSortableHeader('Size', 'size')}
              </tr>
            </thead>
            <tbody>
              {(items as Container[]).map((container) => (
                <tr key={container.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedItems.has(container.id)}
                      onChange={() => handleSelectItem(container.id)}
                    />
                  </td>
                  <td>{container.names.map(name => name.replace('/', '')).join(', ')}</td>
                  <td>{container.image}</td>
                  <td>
                    <span className={`status ${container.state.toLowerCase()}`}>
                      {container.status}
                    </span>
                  </td>
                  <td>{formatDate(container.created)}</td>
                  <td>{formatBytes(container.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'images':
        return (
          <table className="resource-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                {renderSortableHeader('Repository:Tag', 'repoTags')}
                {renderSortableHeader('Image ID', 'id')}
                {renderSortableHeader('Created', 'created')}
                {renderSortableHeader('Size', 'size')}
                {renderSortableHeader('Containers', 'containers')}
              </tr>
            </thead>
            <tbody>
              {(items as Image[]).map((image) => (
                <tr key={image.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedItems.has(image.id)}
                      onChange={() => handleSelectItem(image.id)}
                    />
                  </td>
                  <td>
                    {image.repoTags.length > 0 ? (
                      image.repoTags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))
                    ) : (
                      <span className="tag">&lt;none&gt;</span>
                    )}
                  </td>
                  <td>{image.id.substring(7, 19)}</td>
                  <td>{formatDate(image.created)}</td>
                  <td>{formatBytes(image.size)}</td>
                  <td>{image.containers || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'volumes':
        return (
          <table className="resource-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                {renderSortableHeader('Name', 'name')}
                {renderSortableHeader('Driver', 'driver')}
                {renderSortableHeader('Created', 'created')}
                {renderSortableHeader('Size', 'size')}
                {renderSortableHeader('Ref Count', 'refCount')}
              </tr>
            </thead>
            <tbody>
              {(items as Volume[]).map((volume) => (
                <tr key={volume.name}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedItems.has(volume.name)}
                      onChange={() => handleSelectItem(volume.name)}
                    />
                  </td>
                  <td>{volume.name}</td>
                  <td>{volume.driver}</td>
                  <td>{volume.created ? formatDate(volume.created) : 'N/A'}</td>
                  <td>{formatBytes(volume.size)}</td>
                  <td>{volume.refCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'networks':
        return (
          <table className="resource-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                {renderSortableHeader('Name', 'name')}
                {renderSortableHeader('Driver', 'driver')}
                {renderSortableHeader('Scope', 'scope')}
                {renderSortableHeader('Internal', 'internal')}
                {renderSortableHeader('Created', 'created')}
              </tr>
            </thead>
            <tbody>
              {(items as Network[]).map((network) => (
                <tr key={network.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedItems.has(network.id)}
                      onChange={() => handleSelectItem(network.id)}
                    />
                  </td>
                  <td>{network.name}</td>
                  <td>{network.driver}</td>
                  <td>{network.scope}</td>
                  <td>{network.internal ? 'Yes' : 'No'}</td>
                  <td>{network.created ? formatDate(network.created) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🐳 Docker Cleaner</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Manage and clean up your Docker resources efficiently
        </p>
        
        {systemInfo && (
          <div className="system-info">
            <div className="info-card">
              <h3>Containers</h3>
              <div className="count">{systemInfo.containers.count}</div>
              <div className="size">{formatBytes(systemInfo.containers.size)}</div>
            </div>
            <div className="info-card">
              <h3>Images</h3>
              <div className="count">{systemInfo.images.count}</div>
              <div className="size">{formatBytes(systemInfo.images.size)}</div>
            </div>
            <div className="info-card">
              <h3>Volumes</h3>
              <div className="count">{systemInfo.volumes.count}</div>
              <div className="size">{formatBytes(systemInfo.volumes.size)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'containers' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('containers');
            setSelectedItems(new Set());
            setSearchTerm('');
            setSortConfig(null);
          }}
        >
          Containers ({containers.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('images');
            setSelectedItems(new Set());
            setSearchTerm('');
            setSortConfig(null);
          }}
        >
          Images ({images.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'volumes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('volumes');
            setSelectedItems(new Set());
            setSearchTerm('');
            setSortConfig(null);
          }}
        >
          Volumes ({volumes.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'networks' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('networks');
            setSelectedItems(new Set());
            setSearchTerm('');
            setSortConfig(null);
          }}
        >
          Networks ({networks.length})
        </button>
      </div>

      <div className="resource-section">
        {error && <div className="error">{error}</div>}
        
        <div className="controls">
          <div className="select-controls">
            <button className="btn btn-secondary" onClick={handleSelectAll}>
              {selectedItems.size === getSortedAndFilteredItems().length && getSortedAndFilteredItems().length > 0
                ? 'Deselect All'
                : 'Select All'}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={selectedItems.size === 0 || loading}
            >
              Delete Selected ({selectedItems.size})
            </button>
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              Refresh
            </button>
          </div>
          
          <input
            type="text"
            className="search-box"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
}

export default App;
