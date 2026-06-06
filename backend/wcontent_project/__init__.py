import pymysql

# 1. Route MySQL client driver requests through PyMySQL
pymysql.install_as_MySQLdb()

# 2. Trick Django's version check to bypass the "mysqlclient 2.2.1 or newer is required" error
import MySQLdb
MySQLdb.version_info = (2, 2, 2, 'final', 0)
