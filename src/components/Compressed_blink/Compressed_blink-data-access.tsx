'use client'

import {getCompressedBlinkProgram, getCompressedBlinkProgramId} from '@project/anchor'
import {useConnection} from '@solana/wallet-adapter-react'
import {Cluster, Keypair, PublicKey} from '@solana/web3.js'
import {useMutation, useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import toast from 'react-hot-toast'
import {useCluster} from '../cluster/cluster-data-access'
import {useAnchorProvider} from '../solana/solana-provider'
import {useTransactionToast} from '../ui/ui-layout'

export function useCompressedBlinkProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getCompressedBlinkProgramId(cluster.network as Cluster), [cluster])
  const program = getCompressedBlinkProgram(provider)

  const accounts = useQuery({
    queryKey: ['Compressed_blink', 'all', { cluster }],
    queryFn: () => program.account.Compressed_blink.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['Compressed_blink', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ Compressed_blink: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useCompressedBlinkProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useCompressedBlinkProgram()

  const accountQuery = useQuery({
    queryKey: ['Compressed_blink', 'fetch', { cluster, account }],
    queryFn: () => program.account.Compressed_blink.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['Compressed_blink', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ Compressed_blink: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['Compressed_blink', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ Compressed_blink: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['Compressed_blink', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ Compressed_blink: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['Compressed_blink', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ Compressed_blink: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
