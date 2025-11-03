import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ethers, BrowserProvider } from 'ethers'
import { TOKEN_CONTRACT, STAKING_CONTRACT } from './wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Copy, RefreshCw, Zap, TrendingUp, Clock } from 'lucide-react'

const TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

const STAKING_ABI = [
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function claimRewards()',
  'function getStaked(address) view returns (uint256)',
  'function getReward(address) view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function rewardRate() view returns (uint256)'
]

function App() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [darkMode, setDarkMode] = useState(false)
  const [amount, setAmount] = useState('')
  const [lpBalance, setLpBalance] = useState('0')
  const [ethBalance, setEthBalance] = useState('0')
  const [allowance, setAllowance] = useState('0')
  const [staked, setStaked] = useState('0')
  const [rewards, setRewards] = useState('0')
  const [tvl, setTvl] = useState('0')
  const [apr, setApr] = useState('0')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [timeUntilReward, setTimeUntilReward] = useState(10) // 10s countdown

  const provider = typeof window !== 'undefined' && window.ethereum
    ? new BrowserProvider(window.ethereum)
    : null

  const loadData = async () => {
    if (!address || !provider) return
    try {
      const token = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, provider)
      const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider)

      const [balance, allowanceAmt, stakedAmt, reward, totalStaked, rewardRate, ethBal] = await Promise.all([
        token.balanceOf(address),
        token.allowance(address, STAKING_CONTRACT),
        staking.getStaked(address),
        staking.getReward(address),
        staking.totalStaked(),
        staking.rewardRate(),
        provider.getBalance(address)
      ])

      setLpBalance(ethers.formatEther(balance))
      setAllowance(ethers.formatEther(allowanceAmt))
      setStaked(ethers.formatEther(stakedAmt))
      setRewards(ethers.formatEther(reward))
      setTvl(ethers.formatEther(totalStaked))
      setEthBalance(ethers.formatEther(ethBal))

      const totalStakedNum = parseFloat(ethers.formatEther(totalStaked))
      const rewardRateNum = parseFloat(ethers.formatEther(rewardRate))
      const annualReward = rewardRateNum * 31536000
      const aprValue = totalStakedNum > 0 ? (annualReward / totalStakedNum) * 100 : 0
      setApr(aprValue.toFixed(2))
    } catch (err) {
      console.error("Load error:", err)
    }
  }

  // Auto-refresh every 5s
  useEffect(() => {
    if (isConnected) {
      loadData()
      const interval = setInterval(loadData, 5000)
      return () => clearInterval(interval)
    }
  }, [isConnected, address])

  // Countdown timer (10s cycle)
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      setTimeUntilReward(prev => {
        if (prev <= 1) {
          loadData() // Refresh on zero
          return 10
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected])

  const handleTx = async (action) => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Enter valid amount')
      return
    }
    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const token = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signer)
      const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, signer)
      
      let tx
      if (action === 'approve') {
        tx = await token.approve(STAKING_CONTRACT, ethers.parseEther(amount))
      } else if (action === 'stake') {
        tx = await staking.stake(ethers.parseEther(amount))
      } else if (action === 'unstake') {
        tx = await staking.unstake(ethers.parseEther(amount))
      } else if (action === 'claim') {
        tx = await staking.claimRewards()
      }
      
      const receipt = await tx.wait()
      setTxHash(receipt.hash)
      loadData()
      alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`)
    } catch (err) {
      alert(`${action} failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    alert('Address copied!')
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`rounded-3xl shadow-2xl p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} backdrop-blur-xl`}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Yield Farm Pro
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {!isConnected ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
            >
              Connect Wallet
            </motion.button>
          ) : (
            <>
              {/* Wallet Info */}
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono">{address.slice(0, 8)}...{address.slice(-6)}</span>
                  <button onClick={copyAddress} className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400">
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
                <button
                  onClick={disconnect}
                  className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm opacity-90">TVL</span>
                  </div>
                  <p className="text-2xl font-bold">{parseFloat(tvl).toFixed(2)} LP</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm opacity-90">APR</span>
                  </div>
                  <p className="text-2xl font-bold">{apr}%</p>
                </motion.div>
              </div>

              {/* Rewards Card with Countdown */}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="mb-6 p-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold">Pending Rewards</span>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="flex items-center gap-1"
                  >
                    <Clock className="w-5 h-5" />
                    <span className="font-mono text-xl">{timeUntilReward}s</span>
                  </motion.div>
                </div>
                <p className="text-3xl font-bold mb-2">{parseFloat(rewards).toFixed(6)} REWARD</p>
                <p className="text-sm opacity-90 mb-3">
                  {timeUntilReward === 10 ? 'Calculating...' : `Next reward in ${timeUntilReward}s`}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTx('claim')}
                  disabled={loading || parseFloat(rewards) === 0}
                  className="w-full bg-white text-orange-600 py-3 rounded-xl font-bold text-lg shadow-md disabled:opacity-50 transition-all"
                >
                  {loading ? 'Claiming...' : 'Claim Rewards'}
                </motion.button>
              </motion.div>

              {/* Balance Info */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">LP Balance</p>
                  <p className="font-mono font-bold">{parseFloat(lpBalance).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">Staked</p>
                  <p className="font-mono font-bold">{parseFloat(staked).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
                  <p className="text-sm opacity-90">Wallet ETH</p>
                  <p className="font-mono font-bold">{parseFloat(ethBalance).toFixed(4)} ETH</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <input
                  type="number"
                  placeholder="Amount (e.g. 100)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTx('approve')}
                  disabled={loading || parseFloat(allowance) >= parseFloat(amount)}
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:bg-green-500 disabled:cursor-default transition-colors"
                >
                  {parseFloat(allowance) >= parseFloat(amount) ? 'Approved' : loading ? 'Approving...' : 'Approve'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTx('stake')}
                  disabled={loading || parseFloat(allowance) < parseFloat(amount)}
                  className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Staking...' : 'Stake'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTx('unstake')}
                  disabled={loading || parseFloat(staked) < parseFloat(amount)}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Unstaking...' : 'Unstake'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadData}
                  className="py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>

              {/* Transaction Link */}
              <AnimatePresence>
                {txHash && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                    >
                      View last transaction
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contract Links */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
                <a href={`https://sepolia.etherscan.io/address/${TOKEN_CONTRACT}`} target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  LP Token
                </a>
                {' • '}
                <a href={`https://sepolia.etherscan.io/address/${STAKING_CONTRACT}`} target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Staking Contract
                </a>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default App