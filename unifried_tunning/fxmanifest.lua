fx_version 'adamant'
game 'gta5'

author 'unifried'
description 'Exhaust Overhaul'
version '1.0.0'

lua54 'yes'

shared_scripts {
    'shared/*.lua'
}

client_scripts {
    'client/*.lua'
}

server_scripts {
    'server/*.lua'
}

files {
    'data/*.txt'
    'nui/index.html',
    'nui/js/*.js',
    'nui/imgs/*.png',
    'nui/style/*.css'
}

ui_page 'nui/index.html'
