# Fort Major

Fair, open, robust and transparent digital organization with an uplifting vibe.

## Local development

Add the following network to your dfx config (`~/.config/dfx/networks.json`):

```json
{
 "dev": {
  "bind": "127.0.0.1:8080",
  "type": "ephemeral",
  "replica": {
   "subnet_type": "system"
  }
 }
}
```

You can choose any port to bind, but the name `dev` of the network is mandatory.
