#!/usr/bin/env python3
"""
ChainGPT AI Web3 Integration for ZClipper
Enhances viral clip detection with Web3-aware AI analysis
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ChainGPTEnhancer:
    """ChainGPT AI integration for enhanced viral clip analysis"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or "demo-key"  # Demo mode for live presentation
        self.base_url = "https://api.chaingpt.org"  # Placeholder - would use real API
        self.enabled = True  # Always enabled for demo
        
    async def enhance_clip_metadata(self, clip_data: dict) -> dict:
        """Enhance clip with Web3-aware AI analysis"""
        try:
            logger.info(f"🤖 ChainGPT analyzing viral clip: {clip_data.get('channel', 'unknown')}")
            
            # Extract context from viral messages
            viral_messages = clip_data.get('viral_messages', [])
            channel = clip_data.get('channel', 'streamer')
            viral_score = clip_data.get('viral_score', 0)
            chat_velocity = clip_data.get('chat_velocity', 0)
            
            # Mock AI analysis (in real implementation, would call ChainGPT API)
            enhanced_data = await self._analyze_with_web3_context(
                messages=viral_messages,
                channel=channel,
                viral_score=viral_score,
                chat_velocity=chat_velocity
            )
            
            return {
                **clip_data,
                'ai_enhanced': True,
                'chaingpt_analysis': enhanced_data,
                'web3_enhanced_title': enhanced_data['contextual_title'],
                'web3_hashtags': enhanced_data['web3_hashtags'],
                'community_targets': enhanced_data['target_communities'],
                'enhanced_viral_score': enhanced_data['enhanced_virality_score'],
                'distribution_strategy': enhanced_data['distribution_strategy']
            }
            
        except Exception as e:
            logger.error(f"ChainGPT enhancement failed: {e}")
            return {
                **clip_data,
                'ai_enhanced': False,
                'chaingpt_error': str(e)
            }
    
    async def _analyze_with_web3_context(self, messages: List[str], channel: str, 
                                       viral_score: float, chat_velocity: int) -> dict:
        """Simulate ChainGPT Web3-aware analysis"""
        
        # Analyze message content for Web3/crypto keywords
        web3_keywords = {
            'crypto': ['crypto', 'bitcoin', 'eth', 'solana', 'pump', 'moon', 'diamond hands', 'hodl'],
            'trading': ['bull', 'bear', 'trade', 'buy', 'sell', 'dip', 'ath', 'rekt'],
            'defi': ['defi', 'yield', 'staking', 'liquidity', 'apy', 'farming'],
            'nft': ['nft', 'mint', 'opensea', 'rare', 'floor', 'collection'],
            'gaming': ['play2earn', 'p2e', 'guild', 'scholarship', 'metaverse']
        }
        
        # Count Web3 context
        web3_context = {}
        message_text = ' '.join(messages).lower()
        
        for category, keywords in web3_keywords.items():
            count = sum(message_text.count(keyword) for keyword in keywords)
            if count > 0:
                web3_context[category] = count
        
        # Determine if this is Web3-related content
        is_web3_content = bool(web3_context)
        
        # Generate contextual title
        if is_web3_content:
            primary_context = max(web3_context.items(), key=lambda x: x[1])[0] if web3_context else 'crypto'
            contextual_title = self._generate_web3_title(channel, primary_context, viral_score)
            hashtags = self._generate_web3_hashtags(primary_context, web3_context)
            communities = self._suggest_web3_communities(primary_context)
        else:
            contextual_title = self._generate_gaming_title(channel, viral_score)
            hashtags = self._generate_gaming_hashtags()
            communities = ['TwitchClips', 'StreamHighlights']
        
        # Enhanced virality score with Web3 boost
        enhanced_score = min(100, viral_score + (20 if is_web3_content else 5))
        
        return {
            'contextual_title': contextual_title,
            'web3_hashtags': hashtags,
            'target_communities': communities,
            'enhanced_virality_score': enhanced_score,
            'web3_detected': is_web3_content,
            'web3_context': web3_context,
            'distribution_strategy': self._create_distribution_strategy(is_web3_content, enhanced_score),
            'ai_confidence': 0.95,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def _generate_web3_title(self, channel: str, context: str, viral_score: float) -> str:
        """Generate Web3-aware titles"""
        titles = {
            'crypto': [
                f"{channel}'s INSANE Crypto Reaction Goes Viral",
                f"Streamer {channel} Can't Believe This Crypto Move",
                f"{channel}'s Epic Bitcoin Reaction Breaks Internet"
            ],
            'trading': [
                f"{channel} Trading Reaction Sends Chat Wild",
                f"Streamer {channel}'s Trading Call Goes Viral",
                f"{channel} Can't Handle This Market Move"
            ],
            'nft': [
                f"{channel}'s NFT Mint Reaction is PURE GOLD",
                f"Streamer {channel} Goes CRAZY Over NFT Drop",
                f"{channel}'s NFT Floor Price Reaction"
            ],
            'defi': [
                f"{channel} Discovers Insane DeFi Yield",
                f"Streamer {channel}'s DeFi Reaction Goes Viral",
                f"{channel} Can't Believe These APY Numbers"
            ]
        }
        
        context_titles = titles.get(context, titles['crypto'])
        return context_titles[int(viral_score) % len(context_titles)]
    
    def _generate_gaming_title(self, channel: str, viral_score: float) -> str:
        """Generate gaming-focused titles"""
        titles = [
            f"{channel}'s INSANE Gaming Moment Goes Viral",
            f"Streamer {channel}'s Epic Reaction Breaks Chat",
            f"{channel} Can't Believe What Just Happened",
            f"{channel}'s Unexpected Victory Goes Viral"
        ]
        return titles[int(viral_score) % len(titles)]
    
    def _generate_web3_hashtags(self, primary_context: str, web3_context: dict) -> List[str]:
        """Generate Web3-specific hashtags"""
        base_tags = ['#ZClipperAI', '#Web3Clips', '#ChainGPT']
        
        context_tags = {
            'crypto': ['#CryptoStreaming', '#Bitcoin', '#Ethereum', '#CryptoReaction'],
            'trading': ['#CryptoTrading', '#TradingView', '#MarketReaction', '#DayTrading'],
            'nft': ['#NFT', '#NFTDrop', '#OpenSea', '#DigitalArt'],
            'defi': ['#DeFi', '#YieldFarming', '#Staking', '#LiquidityMining'],
            'gaming': ['#Play2Earn', '#GameFi', '#Metaverse', '#BlockchainGaming']
        }
        
        specific_tags = context_tags.get(primary_context, context_tags['crypto'])
        return base_tags + specific_tags[:4]
    
    def _generate_gaming_hashtags(self) -> List[str]:
        """Generate gaming hashtags"""
        return ['#ZClipperAI', '#TwitchClips', '#GamingMoments', '#StreamHighlights', '#ViralGaming']
    
    def _suggest_web3_communities(self, context: str) -> List[str]:
        """Suggest Web3 communities for distribution"""
        communities = {
            'crypto': ['r/cryptocurrency', 'BitcoinTwitter', 'CryptoTelegram', 'Web3Discord'],
            'trading': ['TradingView', 'CryptoTwitter', 'r/CryptoCurrency', 'TradingDiscord'],
            'nft': ['NFTTwitter', 'OpenSeaDiscord', 'r/NFT', 'NFTCommunity'],
            'defi': ['DeFiPulse', 'r/defi', 'YieldFarmingGroups', 'DeFiTwitter'],
            'gaming': ['GameFiHub', 'Play2EarnDAO', 'MetaverseGroups', 'BlockchainGamers']
        }
        
        return communities.get(context, communities['crypto'])
    
    def _create_distribution_strategy(self, is_web3: bool, viral_score: float) -> dict:
        """Create intelligent distribution strategy"""
        if is_web3:
            return {
                'primary_platforms': ['Twitter', 'Reddit', 'Discord'],
                'optimal_timing': 'Peak Web3 hours (US/EU overlap)',
                'engagement_boost': '+35% from Web3 community targeting',
                'recommended_budget': f'${min(100, viral_score * 2)} for promoted posts'
            }
        else:
            return {
                'primary_platforms': ['TikTok', 'YouTube Shorts', 'Twitter'],
                'optimal_timing': 'Gaming prime time (6-10 PM)',
                'engagement_boost': '+15% from gaming community',
                'recommended_budget': f'${min(50, viral_score)} for promoted posts'
            }
    
    async def get_community_insights(self, clip_data: dict) -> dict:
        """Get community-specific insights for the clip"""
        try:
            return {
                'trending_topics': ['#CryptoPump', '#GameFi', '#Web3Gaming'],
                'community_sentiment': 'Bullish on viral content',
                'engagement_prediction': '2.5x average engagement expected',
                'optimal_post_time': '2PM EST (peak Web3 activity)',
                'suggested_caption': 'This reaction is why we love crypto streams! 🚀',
                'cross_platform_potential': 'High - suitable for Twitter + TikTok'
            }
        except Exception as e:
            logger.error(f"Community insights failed: {e}")
            return {}

# Global ChainGPT instance
chaingpt_enhancer = ChainGPTEnhancer()