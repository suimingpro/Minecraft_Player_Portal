from pydantic import BaseModel


class ServerCreateRequest(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None
    icon_url: str | None = None
    access_mode: str = "all"  # 'all', 'whitelist', 'blacklist'
    is_public: bool = True


class ServerUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    icon_url: str | None = None
    access_mode: str | None = None
    is_public: bool | None = None


class ServerPlayerRuleRequest(BaseModel):
    player_uuid: str
    player_name: str | None = None
    rule_type: str = "whitelist"  # 'whitelist' or 'blacklist'


class BatchAddServerPlayersRequest(BaseModel):
    players: list[ServerPlayerRuleRequest]


class UserAddToWhitelistRequest(BaseModel):
    server_ids: list[str]
