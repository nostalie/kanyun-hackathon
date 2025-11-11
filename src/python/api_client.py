"""
API 客户端 - 用于与游戏服务器通信
"""
import requests
import json
from typing import Dict, Any, Optional


class ApiClient:
    """API 客户端类"""
    
    def __init__(self, config: Dict[str, str]):
        """
        初始化 API 客户端
        
        Args:
            config: 配置字典，包含 apiBaseUrl 和 gameToken
        """
        self.api_base_url = config.get('apiBaseUrl', '')
        self.game_token = config.get('gameToken', '')
    
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        return {
            'Authorization': f'Bearer {self.game_token}',
            'Content-Type': 'application/json',
        }
    
    def _request(self, method: str, url: str, body: Optional[Dict] = None) -> Dict[str, Any]:
        """
        发送 HTTP 请求
        
        Args:
            method: HTTP 方法 (GET, POST, etc.)
            url: 请求 URL
            body: 请求体（可选）
        
        Returns:
            响应数据字典
        
        Raises:
            Exception: 请求失败时抛出异常
        """
        try:
            headers = self._get_headers()
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=body, timeout=10)
            else:
                raise ValueError(f'Unsupported HTTP method: {method}')
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'API request failed: {method} {url}', e)
            raise
    
    def get_game_status(self, game_id: str) -> Dict[str, Any]:
        """
        获取游戏状态
        
        Args:
            game_id: 游戏房间 ID
        
        Returns:
            游戏状态数据
        """
        url = f'{self.api_base_url}/api/player-agent/game/{game_id}/status'
        return self._request('GET', url)
    
    def send_ready(self, game_id: str) -> Dict[str, Any]:
        """
        发送准备信号
        
        Args:
            game_id: 游戏房间 ID
        
        Returns:
            响应数据
        """
        url = f'{self.api_base_url}/api/player-agent/game/{game_id}/ready'
        return self._request('POST', url)
    
    def submit_action(self, game_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        提交行动
        
        Args:
            game_id: 游戏房间 ID
            action: 行动数据
        
        Returns:
            响应数据
        """
        url = f'{self.api_base_url}/api/player-agent/game/{game_id}/action'
        return self._request('POST', url, action)

