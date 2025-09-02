'use client'

import { useState } from 'react'
import { Button, Input, Card, Modal, Tabs, Alert, LoadingSpinner, FileUpload, Table, ProgressBar, Tooltip, Panel, Container, Checkbox, Select, IconButton, SearchInput, Toggle, Separator, Badge } from '../index'

export default function UIDemo() {
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('components')
  const [showAlert, setShowAlert] = useState(true)
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [checkboxValue, setCheckboxValue] = useState(false)
  const [selectValue, setSelectValue] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [toggleValue, setToggleValue] = useState(false)

  const handleFileSelect = (files: File[]) => {
    console.log('Selected files:', files)
  }

  const simulateLoading = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 3000)
  }

  const tabs = [
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'forms', label: 'Forms', icon: '📝' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
    { id: 'data', label: 'Data Display', icon: '📊' },
    { id: 'layout', label: 'Layout', icon: '🏗️' }
  ]

  // Sample data for table
  const sampleData = [
    { id: 1, name: 'Building A', type: 'Commercial', floors: 12, area: 25000, status: 'Active' },
    { id: 2, name: 'Building B', type: 'Residential', floors: 8, area: 18500, status: 'Under Construction' },
    { id: 3, name: 'Building C', type: 'Mixed Use', floors: 15, area: 32000, status: 'Planning' },
    { id: 4, name: 'Building D', type: 'Office', floors: 6, area: 14000, status: 'Active' },
    { id: 5, name: 'Building E', type: 'Retail', floors: 3, area: 8500, status: 'Inactive' }
  ]

  const tableColumns = [
    { key: 'name' as keyof typeof sampleData[0], header: 'Name', sortable: true },
    { key: 'type' as keyof typeof sampleData[0], header: 'Type', sortable: true },
    { key: 'floors' as keyof typeof sampleData[0], header: 'Floors', sortable: true },
    { 
      key: 'area' as keyof typeof sampleData[0], 
      header: 'Area (sq ft)', 
      sortable: true,
      render: (value: number) => value.toLocaleString()
    },
    {
      key: 'status' as keyof typeof sampleData[0],
      header: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded ${
          value === 'Active' ? 'bg-green-600 text-white' :
          value === 'Under Construction' ? 'bg-yellow-600 text-white' :
          value === 'Planning' ? 'bg-blue-600 text-white' :
          'bg-gray-600 text-white'
        }`}>
          {value}
        </span>
      )
    }
  ]

  return (
    <div className="p-8 space-y-8">
      <Card title="UI Component Demo" subtitle="Testing the new reusable components">
        
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === 'components' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Buttons">
                  <div className="space-y-2">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                </Card>

                <Card title="Sizes">
                  <div className="space-y-2">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </Card>

                <Card title="States">
                  <div className="space-y-2">
                    <Button loading={loading} onClick={simulateLoading}>
                      {loading ? 'Loading...' : 'Load Data'}
                    </Button>
                    <Button disabled>Disabled</Button>
                  </div>
                </Card>

                <Card title="Modal">
                  <Button onClick={() => setShowModal(true)}>
                    Open Modal
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'forms' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Input Fields">
                  <div className="space-y-4">
                    <Input 
                      label="Text Input"
                      placeholder="Enter text..."
                      value={inputValue}
                      onChange={setInputValue}
                    />
                    <Input 
                      label="With Error"
                      placeholder="This has an error"
                      error="This field is required"
                    />
                    <Input 
                      label="With Helper Text"
                      placeholder="Helper text example"
                      helperText="This is some helpful information"
                    />
                    <SearchInput
                      label="Search Input"
                      placeholder="Search files..."
                      value={searchValue}
                      onChange={setSearchValue}
                    />
                  </div>
                </Card>

                <Card title="Selection Controls">
                  <div className="space-y-4">
                    <Checkbox
                      label="Accept Terms"
                      description="I agree to the terms and conditions"
                      checked={checkboxValue}
                      onChange={setCheckboxValue}
                    />
                    <Select
                      label="Category"
                      placeholder="Choose a category"
                      value={selectValue}
                      onChange={setSelectValue}
                      options={[
                        { value: 'glb', label: '3D Models' },
                        { value: 'panorama', label: 'Panoramas' },
                        { value: 'data', label: 'Data Files' }
                      ]}
                    />
                    <Toggle
                      label="Enable notifications"
                      description="Get notified about updates"
                      checked={toggleValue}
                      onChange={setToggleValue}
                    />
                  </div>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="File Upload">
                  <FileUpload
                    accept=".glb,.jpg,.png"
                    onFileSelect={handleFileSelect}
                    dragAndDrop={true}
                  />
                </Card>

                <Card title="Icon Buttons">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <IconButton size="sm" variant="primary" tooltip="Play">▶</IconButton>
                      <IconButton size="md" variant="secondary" tooltip="Pause">⏸</IconButton>
                      <IconButton size="lg" variant="danger" tooltip="Stop">⏹</IconButton>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton variant="ghost" tooltip="Edit">✏️</IconButton>
                      <IconButton variant="success" tooltip="Save">💾</IconButton>
                      <IconButton variant="warning" tooltip="Warning">⚠️</IconButton>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {showAlert && (
                  <Alert
                    type="success"
                    title="Success!"
                    message="Components created successfully"
                    dismissible
                    onDismiss={() => setShowAlert(false)}
                  />
                )}
                
                <Alert
                  type="error"
                  message="This is an error message"
                />
                
                <Alert
                  type="warning"
                  message="This is a warning message"
                />
                
                <Alert
                  type="info"
                  message="This is an info message"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Loading States">
                  <div className="space-y-4">
                    <LoadingSpinner size="sm" text="Small spinner" />
                    <LoadingSpinner size="md" text="Medium spinner" />
                    <LoadingSpinner size="lg" text="Large spinner" />
                  </div>
                </Card>

                <Card title="Progress Bars">
                  <div className="space-y-4">
                    <ProgressBar progress={25} label="Upload Progress" color="blue" />
                    <ProgressBar progress={60} label="Processing" color="yellow" />
                    <ProgressBar progress={100} label="Complete" color="green" />
                    <ProgressBar progress={80} size="lg" showPercentage={false} animated={false} />
                  </div>
                </Card>
              </div>

              <Card title="Tooltips">
                <div className="flex space-x-4 justify-center p-8">
                  <Tooltip content="This tooltip appears on top" position="top">
                    <Button variant="secondary">Top</Button>
                  </Tooltip>
                  <Tooltip content="This tooltip appears on the right" position="right">
                    <Button variant="secondary">Right</Button>
                  </Tooltip>
                  <Tooltip content="This tooltip appears on the bottom" position="bottom">
                    <Button variant="secondary">Bottom</Button>
                  </Tooltip>
                  <Tooltip content="This tooltip appears on the left" position="left">
                    <Button variant="secondary">Left</Button>
                  </Tooltip>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <Card title="Badges & Tags">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="purple">Purple</Badge>
                    <Badge variant="gray">Gray</Badge>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Badge size="sm" variant="success">Small</Badge>
                    <Badge size="md" variant="info">Medium</Badge>
                    <Badge size="lg" variant="purple">Large</Badge>
                  </div>
                  <Separator variant="dashed" />
                  <div className="flex flex-wrap gap-2">
                    <Badge removable onRemove={() => console.log('Removed')}>Removable</Badge>
                    <Badge variant="danger" removable onRemove={() => console.log('Removed')}>Delete Me</Badge>
                  </div>
                </div>
              </Card>

              <Card title="Data Table" subtitle="Sortable table with custom renderers">
                <Table
                  data={sampleData}
                  columns={tableColumns}
                  onRowClick={(row) => console.log('Clicked:', row)}
                />
              </Card>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Panel 
                  title="Collapsible Panel" 
                  subtitle="Click to expand/collapse"
                  collapsible={true}
                  defaultExpanded={false}
                >
                  <p className="text-gray-300">
                    This panel can be collapsed and expanded. Great for organizing content sections.
                  </p>
                </Panel>

                <Panel 
                  title="Panel with Actions" 
                  headerActions={
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost">Edit</Button>
                      <Button size="sm" variant="danger">Delete</Button>
                    </div>
                  }
                >
                  <p className="text-gray-300">
                    This panel has action buttons in the header area.
                  </p>
                </Panel>
              </div>

              <Card title="Container Examples">
                <div className="space-y-4">
                  <Container maxWidth="sm" className="bg-gray-700 p-4 rounded">
                    <p className="text-center text-gray-300">Small Container (max-w-sm)</p>
                  </Container>
                  <Container maxWidth="md" className="bg-gray-700 p-4 rounded">
                    <p className="text-center text-gray-300">Medium Container (max-w-md)</p>
                  </Container>
                  <Container maxWidth="lg" className="bg-gray-700 p-4 rounded">
                    <p className="text-center text-gray-300">Large Container (max-w-4xl)</p>
                  </Container>
                </div>
              </Card>
            </div>
          )}
        </Tabs>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Example Modal"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowModal(false)}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            This is an example modal dialog. It demonstrates the modal component
            with proper backdrop, close handling, and footer actions.
          </p>
          <Input 
            label="Modal Input"
            placeholder="Enter something..."
          />
        </div>
      </Modal>
    </div>
  )
}