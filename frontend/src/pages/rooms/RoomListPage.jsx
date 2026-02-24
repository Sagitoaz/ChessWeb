import React from 'react'
import { Card } from '../../components/common/card'
import { Button } from '../../components/common/button'
import { Input } from '../../components/common/input'

export default function RoomListPage() {
  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Phòng</h1>

        <div className="flex gap-2">
          <Button>Create Room</Button>
          <Button variant="outline">Tham gia</Button>
        </div>
      </div>

      {/* Join by code */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-medium">Tham gia bằng mã</h2>
          <div className="flex gap-2">
            <Input placeholder="Nhập mã phòng (ví dụ: ABC123)" />
            <Button>Tham gia</Button>
          </div>
        </div>
      </Card>

      {/* Recent rooms */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-medium">Phòng hiện tại</h2>

          <div className="text-sm opacity-70">
            Bạn chưa tham gia phòng nào. Hãy tạo hoặc tham gia một phòng để bắt đầu!
          </div>
        </div>
      </Card>
    </div>
  )
}