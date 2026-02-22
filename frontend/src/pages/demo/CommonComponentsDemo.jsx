import { useState } from 'react'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Avatar,
  AvatarGroup,
  Loader,
  Spinner,
  Skeleton,
  Modal,
  Dropdown,
  useNotification,
} from '@/components/common'

const CommonComponentsDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const { showNotification } = useNotification()

  const handleShowNotification = (type) => {
    showNotification(
      type === 'success' ? 'Success message!' : 
      type === 'error' ? 'Error message!' : 
      type === 'warning' ? 'Warning message!' : 
      'Info message!',
      type
    )
  }

  const dropdownItems = [
    { label: 'Profile', value: 'profile', icon: '👤' },
    { label: 'Settings', value: 'settings', icon: '⚙️' },
    { label: 'Logout', value: 'logout', icon: '🚪', danger: true },
  ]

  const users = [
    { id: 1, username: 'Alice', avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, username: 'Bob', avatar: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, username: 'Charlie', avatar: 'https://i.pravatar.cc/150?img=3' },
    { id: 4, username: 'David', avatar: 'https://i.pravatar.cc/150?img=4' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Common Components Demo
        </h1>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button loading={true}>Loading</Button>
            </div>
          </CardBody>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 max-w-md">
              <Input
                label="Username"
                placeholder="Enter username"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="Enter email"
                helperText="We'll never share your email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
              />
              <Input
                label="Disabled"
                placeholder="Disabled input"
                disabled
              />
              <Input
                label="With Error"
                placeholder="Invalid input"
                error="This field is required"
              />
            </div>
          </CardBody>
        </Card>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Simple Card</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600 dark:text-gray-300">
                This is a simple card component with header and body.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card with Footer</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600 dark:text-gray-300">
                This card has a footer with actions.
              </p>
            </CardBody>
            <CardFooter>
              <Button variant="primary" size="sm">Action</Button>
              <Button variant="ghost" size="sm">Cancel</Button>
            </CardFooter>
          </Card>

          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Bordered Card</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600 dark:text-gray-300">
                This is a bordered variant of the card.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Avatars */}
        <Card>
          <CardHeader>
            <CardTitle>Avatars</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar src="https://i.pravatar.cc/150?img=1" alt="User" size="sm" />
                <Avatar src="https://i.pravatar.cc/150?img=2" alt="User" size="md" />
                <Avatar src="https://i.pravatar.cc/150?img=3" alt="User" size="lg" />
                <Avatar src="https://i.pravatar.cc/150?img=4" alt="User" size="xl" />
              </div>
              
              <div className="flex items-center gap-4">
                <Avatar fallback="AB" size="md" />
                <Avatar fallback="CD" size="md" status="online" />
                <Avatar fallback="EF" size="md" status="offline" />
                <Avatar fallback="GH" size="md" status="busy" />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Avatar Group
                </p>
                <AvatarGroup users={users} max={3} size="md" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Loaders */}
        <Card>
          <CardHeader>
            <CardTitle>Loaders & Skeletons</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div className="flex items-center gap-8">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </div>
              
              <div className="flex items-center gap-4">
                <Loader size="sm" text="Loading..." />
                <Loader size="md" text="Processing..." />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Modal & Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>Modal & Dropdown</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setIsModalOpen(true)}>
                Open Modal
              </Button>

              <Dropdown
                trigger={<Button>Dropdown Menu</Button>}
                items={dropdownItems}
                onSelect={(item) => console.log('Selected:', item)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button variant="success" onClick={() => handleShowNotification('success')}>
                Success
              </Button>
              <Button variant="danger" onClick={() => handleShowNotification('error')}>
                Error
              </Button>
              <Button variant="warning" onClick={() => handleShowNotification('warning')}>
                Warning
              </Button>
              <Button variant="primary" onClick={() => handleShowNotification('info')}>
                Info
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Modal Component */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Demo Modal"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              This is a modal dialog. You can put any content here.
            </p>
            <Input
              label="Example Input"
              placeholder="Type something..."
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default CommonComponentsDemo
