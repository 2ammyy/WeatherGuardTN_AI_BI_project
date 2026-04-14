f = open('/app/app/main.py', 'a')
f.write('\n\n@app.on_event("startup")\nasync def startup():\n    start_scheduler()\n\n@app.on_event("shutdown")\nasync def shutdown():\n    stop_scheduler()\n')
f.close()
print('Done')
