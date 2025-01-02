import path from 'path';
import nodeExternals from 'webpack-node-externals';
import webpack from 'webpack';

export default {
    entry: './src/api/finddetailword.js', // File đầu vào
    output: {
        filename: 'finddetailword.bundle.js', // Tên file đầu ra
        path: path.resolve('dist'), // Thư mục đầu ra
    },
    target: 'node', // Môi trường Node.js
    externals: [nodeExternals()], // Loại bỏ các module của Node.js khỏi bundle
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.js$/, // Chỉ định xử lý file .js
                exclude: /node_modules/, // Loại bỏ thư viện bên thứ ba
                use: {
                    loader: 'babel-loader', // Chuyển đổi mã ES6 thành ES5
                },
            },
        ],
    },
    plugins: [
        new webpack.IgnorePlugin({
            resourceRegExp: /^express$/, // Bỏ qua các cảnh báo từ Express
        }),
        new webpack.ContextReplacementPlugin(
            /express/, // Module gây cảnh báo
            (data) => {
                delete data.dependencies[0].critical; // Xóa cảnh báo
                return data;
            }
        ),
    ],
};
