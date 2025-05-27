"use client"

import { useQueryClient } from "@tanstack/react-query"

export function useAppQueryClient() {
  return useQueryClient()
}
