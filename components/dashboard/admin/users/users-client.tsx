"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

import { deleteUser } from "@/actions/user-actions"
import type { UserDocument } from "@/lib/db/models/user"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

interface UsersClientProps {
  initialData: UserDocument[]
}

const UsersClient: React.FC<UsersClientProps> = ({ initialData }) => {
  const [data, setData] = useState<UserDocument[]>(initialData)
  const router = useRouter()

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const onDelete = async (id: string) => {
    try {
      await deleteUser(id)
      setData((prev) => prev.filter((item) => item.id !== id))
      toast.success("User deleted")
    } catch (error: any) {
      toast.error("Something went wrong.")
    } finally {
      router.refresh()
    }
  }

  return (
    <>
      <Table>
        <TableCaption>A list of your users.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onDelete(user.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  )
}

export default UsersClient
