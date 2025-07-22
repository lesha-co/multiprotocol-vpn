if [ -f "/.env" ]; then
    set -a
    source /.env
    set +a
fi

/cmd.sh

while true; do
    sleep 1
done
